import { copyFileSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import {
  DATA_DIR,
  DEFAULT_DB_URL,
  databasePathFromUrl,
} from "./lib/paths.mjs";
import { countUsersInDatabase } from "./lib/db-user-count.mjs";
import {
  GOLDEN_BACKUP_PATH,
  countUsersInGoldenBackup,
  goldenBackupExists,
  updateGoldenBackup,
} from "./golden-backup.mjs";

const BACKUP_DIR = `${DATA_DIR}/backups`;

function removeWalFiles(dbPath) {
  for (const suffix of ["-wal", "-shm"]) {
    try {
      unlinkSync(`${dbPath}${suffix}`);
    } catch {
      /* opcional */
    }
  }
}

function listBackupsNewestFirst() {
  if (!existsSync(BACKUP_DIR)) return [];

  return readdirSync(BACKUP_DIR)
    .filter(
      (name) =>
        name.startsWith("ecohub-") &&
        name.endsWith(".db") &&
        name !== "ecohub-golden.db"
    )
    .map((name) => {
      const full = join(BACKUP_DIR, name);
      return { path: full, mtime: statSync(full).mtimeMs, size: statSync(full).size };
    })
    .filter((entry) => entry.size > 0)
    .sort((a, b) => b.mtime - a.mtime);
}

async function restoreFromFile(backupPath, dbPath) {
  if (existsSync(dbPath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    copyFileSync(dbPath, `${dbPath}.before-restore-${stamp}`);
  }
  copyFileSync(backupPath, dbPath);
  removeWalFiles(dbPath);

  const verified = await countUsersInDatabase(`file:${dbPath}`);
  if (verified > 0) {
    console.log(`[ecohub:restore] Restaurado com ${verified} usuário(s) ← ${backupPath}`);
    return { restored: true, userCount: verified, from: backupPath };
  }
  return null;
}

/**
 * Restaura o banco se estiver vazio ou com menos usuários que o esperado.
 * @param {string} [dbPath]
 * @param {{ minUsers?: number }} [options]
 */
export async function restoreDatabaseIfNeeded(
  dbPath = databasePathFromUrl(process.env.DATABASE_URL) ?? databasePathFromUrl(DEFAULT_DB_URL),
  options = {}
) {
  const minUsers = options.minUsers ?? 1;

  if (!dbPath) {
    return { restored: false, userCount: 0, reason: "no-db-path" };
  }

  const databaseUrl = `file:${dbPath}`;
  const currentUsers = await countUsersInDatabase(databaseUrl);

  if (currentUsers >= minUsers) {
    return { restored: false, userCount: currentUsers, reason: "ok" };
  }

  const sources = [];

  if (goldenBackupExists()) {
    sources.push({ path: GOLDEN_BACKUP_PATH, label: "golden" });
  }

  for (const backup of listBackupsNewestFirst()) {
    sources.push({ path: backup.path, label: "backup" });
  }

  for (const source of sources) {
    const backupUsers = await countUsersInDatabase(`file:${source.path}`);
    if (backupUsers < minUsers) continue;

    try {
      const result = await restoreFromFile(source.path, dbPath);
      if (result) {
        return { ...result, source: source.label };
      }
    } catch (error) {
      console.warn(
        "[ecohub:restore] Falha:",
        source.path,
        error instanceof Error ? error.message : error
      );
    }
  }

  return { restored: false, userCount: currentUsers, reason: "no-valid-backup" };
}

/** @deprecated use restoreDatabaseIfNeeded */
export async function restoreDatabaseIfEmpty(dbPath) {
  return restoreDatabaseIfNeeded(dbPath, { minUsers: 1 });
}
