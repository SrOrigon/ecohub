import { copyFileSync, existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_BACKUP_DIR } from "./lib/paths.mjs";
import { countUsersInDatabase } from "./lib/db-user-count.mjs";

export const GOLDEN_BACKUP_FILENAME = "ecohub-golden.db";
export const GOLDEN_BACKUP_PATH = join(DEFAULT_BACKUP_DIR, GOLDEN_BACKUP_FILENAME);

function removeWalFiles(dbPath) {
  for (const suffix of ["-wal", "-shm"]) {
    try {
      unlinkSync(`${dbPath}${suffix}`);
    } catch {
      /* opcional */
    }
  }
}

/**
 * Atualiza o backup dourado (nunca apagado) quando há contas no banco.
 */
export async function updateGoldenBackup(dbPath) {
  if (!dbPath || !existsSync(dbPath)) {
    return { updated: false, reason: "no-db" };
  }

  const users = await countUsersInDatabase(`file:${dbPath}`);
  if (users <= 0) {
    return { updated: false, reason: "no-users", userCount: 0 };
  }

  mkdirSync(DEFAULT_BACKUP_DIR, { recursive: true });

  const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
  try {
    await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(FULL)");
  } catch {
    /* continua com cópia */
  } finally {
    await prisma.$disconnect();
  }

  copyFileSync(dbPath, GOLDEN_BACKUP_PATH);
  removeWalFiles(GOLDEN_BACKUP_PATH);

  console.log(`[ecohub:golden] Backup dourado atualizado (${users} usuário(s)) → ${GOLDEN_BACKUP_PATH}`);
  return { updated: true, userCount: users, path: GOLDEN_BACKUP_PATH };
}

export function goldenBackupExists() {
  return existsSync(GOLDEN_BACKUP_PATH) && statSync(GOLDEN_BACKUP_PATH).size > 0;
}

export async function countUsersInGoldenBackup() {
  if (!goldenBackupExists()) return 0;
  return countUsersInDatabase(`file:${GOLDEN_BACKUP_PATH}`);
}

const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/golden-backup.mjs");

if (isMain) {
  import("./lib/paths.mjs").then(({ databasePathFromUrl, DEFAULT_DB_URL }) => {
    const dbPath =
      databasePathFromUrl(process.env.DATABASE_URL) ?? databasePathFromUrl(DEFAULT_DB_URL);
    updateGoldenBackup(dbPath).catch((error) => {
      console.error("[golden] Falhou:", error instanceof Error ? error.message : error);
      process.exit(1);
    });
  });
}
