import { copyFileSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_DB_URL, databasePathFromUrl } from "./lib/paths.mjs";
import { countUsersInDatabase } from "./lib/db-user-count.mjs";

const BACKUP_DIR = "/data/backups";

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
  if (!existsSync(BACKUP_DIR)) return [];

  return readdirSync(BACKUP_DIR)
    .filter((name) => name.startsWith("ecohub-") && name.endsWith(".db"))
    .map((name) => {
      const path = join(BACKUP_DIR, name);
      return { path, name, mtime: statSync(path).mtimeMs, size: statSync(path).size };
    })
    .filter((entry) => entry.size > 0);
}

/**
 * Encontra o backup com mais usuários (golden + todos os timestamped).
 */
export async function findBestBackupSource() {
  const candidates = listAllBackupFiles();

  let best = null;

  for (const candidate of candidates) {
    const users = await countUsersInDatabase(`file:${candidate.path}`);
    if (users <= 0) continue;
    if (!best || users > best.users) {
      best = { path: candidate.path, label: candidate.name === "ecohub-golden.db" ? "golden" : "backup", users };
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

/**
 * Restaura do backup com MAIS usuários se o banco atual estiver vazio ou pior.
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

  const best = await findBestBackupSource();

  if (!best || best.users < minUsers) {
    console.warn(
      `[ecohub:restore] Nenhum backup com usuários encontrado (atual: ${currentUsers}, necessário: ${minUsers}).`
    );
    return { restored: false, userCount: currentUsers, reason: "no-valid-backup" };
  }

  if (best.users <= currentUsers) {
    return { restored: false, userCount: currentUsers, reason: "ok" };
  }

  try {
    const result = await restoreFromFile(best.path, dbPath);
    if (result) {
      return { ...result, source: best.label, backupUsers: best.users };
    }
  } catch (error) {
    console.warn(
      "[ecohub:restore] Falha ao restaurar melhor backup:",
      best.path,
      error instanceof Error ? error.message : error
    );
  }

  return { restored: false, userCount: currentUsers, reason: "restore-failed" };
}

/** @deprecated */
export async function restoreDatabaseIfEmpty(dbPath) {
  return restoreDatabaseIfNeeded(dbPath, { minUsers: 1 });
}
