/**
 * Garante que contas (logins) sejam gravadas no volume persistente em produção.
 */
import { accessSync, constants, copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  ACCOUNT_SNAPSHOT_PATH,
  DATABASE_COPY_PATH,
  GOLDEN_BACKUP_PATH,
  PRODUCTION_DATABASE_PATH,
  PRODUCTION_DATABASE_URL,
} from "@/lib/production-database";

const DATA_DIR = process.env.ECOHUB_DATA_DIR?.trim() || "/data";

export function databasePathFromUrl(url = process.env.DATABASE_URL): string | null {
  if (!url?.trim()) return null;
  return url.trim().replace(/^file:/, "");
}

export function isOnPersistentVolume(dbPath: string | null): boolean {
  if (!dbPath) return false;
  const normalized = dbPath.replace(/\\/g, "/");
  return normalized === DATA_DIR || normalized.startsWith(`${DATA_DIR}/`);
}

/** Força banco em /data/prod.db e valida volume gravável. */
export function assertProductionDatabasePersistent(): void {
  if (process.env.NODE_ENV !== "production") return;

  process.env.DATABASE_URL = PRODUCTION_DATABASE_URL;

  try {
    mkdirSync(DATA_DIR, { recursive: true });
    mkdirSync(dirname(GOLDEN_BACKUP_PATH), { recursive: true });
    accessSync(DATA_DIR, constants.W_OK);
  } catch (error) {
    console.error(
      "[persistência] CRÍTICO: volume /data não gravável:",
      error instanceof Error ? error.message : error
    );
    throw new Error("PERSISTENCE_UNAVAILABLE: monte o volume Railway em /data");
  }

  if (!isOnPersistentVolume(PRODUCTION_DATABASE_PATH)) {
    throw new Error("PERSISTENCE_UNAVAILABLE: banco deve estar em /data/prod.db");
  }
}

/** Copia prod.db para golden + cópia extra imediatamente após cadastro. */
export async function persistGoldenBackupNow(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const { prisma } = await import("@/lib/db");

  try {
    await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(FULL)");
  } catch {
    /* continua */
  }

  if (!existsSync(PRODUCTION_DATABASE_PATH)) {
    console.warn("[persistência] prod.db não encontrado para backup dourado.");
    return;
  }

  mkdirSync(dirname(GOLDEN_BACKUP_PATH), { recursive: true });
  copyFileSync(PRODUCTION_DATABASE_PATH, GOLDEN_BACKUP_PATH);
  copyFileSync(PRODUCTION_DATABASE_PATH, DATABASE_COPY_PATH);

  const userCount = await prisma.user.count();
  writeFileSync(
    ACCOUNT_SNAPSHOT_PATH,
    `${JSON.stringify({ userCount, updatedAt: new Date().toISOString() })}\n`,
    "utf8"
  );

  console.log(`[persistência] Backup dourado salvo (${userCount} usuário(s)).`);
}

/** Confirma que o usuário foi gravado no banco após create. */
export async function confirmUserPersisted(
  findUser: (id: string) => Promise<{ id: string } | null>,
  userId: string
): Promise<void> {
  const saved = await findUser(userId);
  if (!saved) {
    console.error("[persistência] CRÍTICO: usuário criado mas não encontrado no banco:", userId);
    throw new Error("USER_NOT_PERSISTED");
  }

  await persistGoldenBackupNow();
}
