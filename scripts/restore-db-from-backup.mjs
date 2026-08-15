import { copyFileSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_DB_URL, databasePathFromUrl } from "./lib/paths.mjs";
import { countUsersInDatabase } from "./lib/db-user-count.mjs";

const BACKUP_DIR = "/data/backups";
const GOLDEN_BACKUP_PATH = "/data/backups/ecohub-golden.db";
const DATABASE_COPY_PATH = "/data/ecohub-prod-copy.db";
const PRODUCTION_DB_PATH = "/data/prod.db";

function removeWalFiles(dbPath) {
  for (const suffix of ["-wal", "-shm"]) {
    try {
      unlinkSync(`${dbPath}${suffix}`);
    } catch {
      /* opcional */
    }
  }
}

function listAllBackupFiles() {
  const fixed = [GOLDEN_BACKUP_PATH, DATABASE_COPY_PATH, PRODUCTION_DB_PATH];
  const fromDir = existsSync(BACKUP_DIR)
    ? readdirSync(BACKUP_DIR)
        .filter((name) => name.startsWith("ecohub-") && name.endsWith(".db"))
        .map((name) => join(BACKUP_DIR, name))
    : [];

  const seen = new Set();
  const all = [...fixed, ...fromDir].filter((path) => {
    if (seen.has(path)) return false;
    seen.add(path);
    return existsSync(path) && statSync(path).size > 0;
  });

  return all.map((path) => ({ path, size: statSync(path).size }));
}

export async function findBestBackupSource() {
  const candidates = listAllBackupFiles();
  let best = null;

  for (const candidate of candidates) {
    if (candidate.path === PRODUCTION_DB_PATH) continue;

    const users = await countUsersInDatabase(`file:${candidate.path}`);
    if (users <= 0) continue;
    if (!best || users > best.users) {
      const label = candidate.path.includes("golden")
        ? "golden"
        : candidate.path.includes("prod-copy")
          ? "copy"
          : "backup";
      best = { path: candidate.path, label, users };
    }
  }

  return best;
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

export async function restoreDatabaseIfNeeded(
  dbPath = databasePathFromUrl(process.env.DATABASE_URL) ?? databasePathFromUrl(DEFAULT_DB_URL),
  options = {}
) {
  const minUsers = options.minUsers ?? 1;

  if (!dbPath) {
    return { restored: false, userCount: 0, reason: "no-db-path" };
  }

  const databaseUrl = `file:${dbPath}`;
  let currentUsers = await countUsersInDatabase(databaseUrl);

  if (currentUsers === -1) {
    console.warn("[ecohub:restore] Leitura incerta — não restaurar para evitar perda.");
    return { restored: false, userCount: -1, reason: "read-error" };
  }

  if (currentUsers >= minUsers) {
    return { restored: false, userCount: currentUsers, reason: "ok" };
  }

  const best = await findBestBackupSource();

  if (!best || best.users < minUsers) {
    console.warn(
      `[ecohub:restore] Nenhum backup com usuários (atual: ${currentUsers}, necessário: ${minUsers}).`
    );
    return { restored: false, userCount: currentUsers, reason: "no-valid-backup" };
  }

  try {
    const result = await restoreFromFile(best.path, dbPath);
    if (result) {
      copyFileSync(dbPath, GOLDEN_BACKUP_PATH);
      copyFileSync(dbPath, DATABASE_COPY_PATH);
      return { ...result, source: best.label, backupUsers: best.users };
    }
  } catch (error) {
    console.warn(
      "[ecohub:restore] Falha ao restaurar:",
      best.path,
      error instanceof Error ? error.message : error
    );
  }

  return { restored: false, userCount: currentUsers, reason: "restore-failed" };
}

export async function restoreDatabaseIfEmpty(dbPath) {
  return restoreDatabaseIfNeeded(dbPath, { minUsers: 1 });
}
