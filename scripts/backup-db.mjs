#!/usr/bin/env node
/**
 * Backup seguro do SQLite via VACUUM INTO (consistente mesmo com WAL).
 * Nunca faz backup de banco vazio se já existiam contas (protege histórico).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  databasePathFromUrl,
  DEFAULT_BACKUP_DIR,
  isInstitutionalMode,
  isPersistentDatabasePath,
  PERSISTENCE_MANIFEST,
} from "./lib/paths.mjs";
import { countUsersInDatabase } from "./lib/db-user-count.mjs";
import { updateGoldenBackup, GOLDEN_BACKUP_FILENAME } from "./golden-backup.mjs";

const MAX_BACKUPS = Number.parseInt(process.env.ECOHUB_MAX_BACKUPS ?? "14", 10);

function resolveBackupDir(explicit, dbPath) {
  if (explicit) return explicit;
  if (isInstitutionalMode() || isPersistentDatabasePath(dbPath)) {
    return DEFAULT_BACKUP_DIR;
  }
  return "./backups";
}

function sqlPath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "''");
}

function readPreviousUserCount() {
  try {
    if (!existsSync(PERSISTENCE_MANIFEST)) return 0;
    const manifest = JSON.parse(readFileSync(PERSISTENCE_MANIFEST, "utf8"));
    return manifest.userCount ?? 0;
  } catch {
    return 0;
  }
}

async function pruneOldBackups(destDir, keep) {
  if (!existsSync(destDir) || keep < 1) return;

  const files = readdirSync(destDir)
    .filter(
      (name) =>
        name.startsWith("ecohub-") &&
        name.endsWith(".db") &&
        name !== GOLDEN_BACKUP_FILENAME
    )
    .map((name) => {
      const full = join(destDir, name);
      return { full, mtime: statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  const emptyBackups = [];
  for (const entry of files) {
    const users = await countUsersInDatabase(`file:${entry.full}`);
    if (users > 0) {
      console.log(`[backup] Preservado (tem ${users} usuário(s)):`, entry.full);
      continue;
    }
    emptyBackups.push(entry);
  }

  for (const entry of emptyBackups.slice(keep)) {
    try {
      unlinkSync(entry.full);
      console.log("[backup] Removido backup vazio antigo:", entry.full);
    } catch (error) {
      console.warn(
        "[backup] Não foi possível remover backup antigo:",
        error instanceof Error ? error.message : error
      );
    }
  }
}

/**
 * @param {{ dbPath?: string, destDir?: string, label?: string, minUsers?: number }} [options]
 */
export async function backupDatabase(options = {}) {
  const dbPath =
    options.dbPath ?? databasePathFromUrl() ?? "./prisma/dev.db";
  const destDir = resolveBackupDir(options.destDir, dbPath);
  const label = options.label ?? "manual";

  if (!existsSync(dbPath)) {
    return { skipped: true, reason: "no-db", dbPath };
  }

  const userCount = await countUsersInDatabase(`file:${dbPath}`);
  const previousUsers = options.minUsers ?? readPreviousUserCount();

  if (userCount === 0 && previousUsers > 0) {
    console.warn(
      `[backup] Ignorado: banco vazio mas havia ${previousUsers} usuário(s). Restaure antes de fazer backup.`
    );
    return { skipped: true, reason: "empty-db-with-history", userCount: 0, previousUsers };
  }

  if (userCount === 0) {
    console.log("[backup] Ignorado: banco sem usuários (primeiro deploy).");
    return { skipped: true, reason: "no-users", userCount: 0 };
  }

  mkdirSync(destDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dest = join(destDir, `ecohub-${stamp}.db`);

  const prisma = createProductionPrisma();
  try {
    await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(FULL)");
    await prisma.$executeRawUnsafe(`VACUUM INTO '${sqlPath(dest)}'`);
  } finally {
    await prisma.$disconnect();
  }

  await updateGoldenBackup(dbPath);

  await pruneOldBackups(destDir, MAX_BACKUPS);
  console.log(`[backup] OK (${label}, ${userCount} usuário(s)) → ${dest}`);
  return { ok: true, path: dest, label, userCount };
}

const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/backup-db.mjs");

if (isMain) {
  const dbPath = process.argv[2] ?? databasePathFromUrl() ?? "./prisma/dev.db";
  const destDir = resolveBackupDir(process.argv[3], dbPath);

  backupDatabase({ dbPath, destDir, label: "cli" }).catch((error) => {
    console.error("[backup] Falhou:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
