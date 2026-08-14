#!/usr/bin/env node
/**
 * Backup seguro do SQLite via VACUUM INTO (consistente mesmo com WAL).
 * Uso: node scripts/backup-db.mjs [caminho-db] [pasta-destino]
 */
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  databasePathFromUrl,
  DEFAULT_BACKUP_DIR,
  isInstitutionalMode,
  isPersistentDatabasePath,
} from "./lib/paths.mjs";

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

function pruneOldBackups(destDir, keep) {
  if (!existsSync(destDir) || keep < 1) return;

  const files = readdirSync(destDir)
    .filter((name) => name.startsWith("ecohub-") && name.endsWith(".db"))
    .map((name) => {
      const full = join(destDir, name);
      return { full, mtime: statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  for (const entry of files.slice(keep)) {
    try {
      unlinkSync(entry.full);
      console.log("[backup] Removido backup antigo:", entry.full);
    } catch (error) {
      console.warn(
        "[backup] Não foi possível remover backup antigo:",
        error instanceof Error ? error.message : error
      );
    }
  }
}

/**
 * @param {{ dbPath?: string, destDir?: string, label?: string }} [options]
 */
export async function backupDatabase(options = {}) {
  const dbPath =
    options.dbPath ??
    databasePathFromUrl() ??
    "./prisma/dev.db";
  const destDir = resolveBackupDir(options.destDir, dbPath);
  const label = options.label ?? "manual";

  if (!existsSync(dbPath)) {
    return { skipped: true, reason: "no-db", dbPath };
  }

  mkdirSync(destDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dest = join(destDir, `ecohub-${stamp}.db`);

  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${sqlPath(dest)}'`);
  } finally {
    await prisma.$disconnect();
  }

  pruneOldBackups(destDir, MAX_BACKUPS);
  console.log(`[backup] OK (${label}) → ${dest}`);
  return { ok: true, path: dest, label };
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
