import { copyFileSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  DATA_DIR,
  DEFAULT_DB_URL,
  databasePathFromUrl,
} from "./lib/paths.mjs";

const BACKUP_DIR = `${DATA_DIR}/backups`;

async function countUsers(databaseUrl) {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    return await prisma.user.count();
  } catch {
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

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
    .filter((name) => name.startsWith("ecohub-") && name.endsWith(".db"))
    .map((name) => {
      const full = join(BACKUP_DIR, name);
      return { path: full, mtime: statSync(full).mtimeMs, size: statSync(full).size };
    })
    .filter((entry) => entry.size > 0)
    .sort((a, b) => b.mtime - a.mtime);
}

/**
 * Se o banco principal estiver vazio, restaura do backup mais recente com usuários.
 */
export async function restoreDatabaseIfEmpty(dbPath = databasePathFromUrl(DEFAULT_DB_URL)) {
  if (!dbPath) {
    return { restored: false, userCount: 0, reason: "no-db-path" };
  }

  const databaseUrl = `file:${dbPath}`;
  const currentUsers = await countUsers(databaseUrl);

  if (currentUsers > 0) {
    return { restored: false, userCount: currentUsers, reason: "has-users" };
  }

  const backups = listBackupsNewestFirst();
  if (backups.length === 0) {
    console.warn("[ecohub:restore] Banco vazio e sem backups em", BACKUP_DIR);
    return { restored: false, userCount: 0, reason: "no-backups" };
  }

  for (const backup of backups) {
    const backupUsers = await countUsers(`file:${backup.path}`);
    if (backupUsers <= 0) continue;

    try {
      if (existsSync(dbPath)) {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        copyFileSync(dbPath, `${dbPath}.empty-${stamp}`);
      }
      copyFileSync(backup.path, dbPath);
      removeWalFiles(dbPath);

      const verified = await countUsers(databaseUrl);
      if (verified > 0) {
        console.log(
          `[ecohub:restore] Banco restaurado com ${verified} usuário(s) a partir de ${backup.path}`
        );
        return { restored: true, userCount: verified, from: backup.path };
      }
    } catch (error) {
      console.warn(
        "[ecohub:restore] Falha ao restaurar backup:",
        backup.path,
        error instanceof Error ? error.message : error
      );
    }
  }

  return { restored: false, userCount: 0, reason: "no-valid-backup" };
}
