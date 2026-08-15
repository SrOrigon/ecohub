import { PrismaClient } from "@prisma/client";
import { applyDurableDatabaseUrl, isPostgresUrl } from "./database-mode.mjs";

/**
 * Conta usuários em um banco SQLite via Prisma (URL explícita).
 * Retorna -1 se não foi possível ler (evita restauração destrutiva).
 * @param {string} databaseUrl
 * @param {{ flushWal?: boolean }} [options]
 */
export async function countUsersInDatabase(databaseUrl, options = {}) {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    if (options.flushWal && !isPostgresUrl(databaseUrl)) {
      await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(FULL)");
    }
    return await prisma.user.count();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Arquivo novo / schema ainda não aplicado: tratar como vazio, não como leitura incerta.
    if (message.includes("does not exist in the current database") || message.includes("no such table") || message.includes("does not exist")) {
      return 0;
    }
    console.warn("[db-count] Falha ao contar usuários:", databaseUrl, message);
    return -1;
  } finally {
    await prisma.$disconnect();
  }
}

export function productionDatabaseUrl() {
  return applyDurableDatabaseUrl();
}

export function createProductionPrisma() {
  return new PrismaClient({
    datasources: { db: { url: productionDatabaseUrl() } },
  });
}

export async function withSqliteBusyTimeout(prisma) {
  if (isPostgresUrl(process.env.DATABASE_URL)) return;
  try {
    await prisma.$executeRawUnsafe("PRAGMA busy_timeout = 10000");
  } catch {
    /* opcional */
  }
}
