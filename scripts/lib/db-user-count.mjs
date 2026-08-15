import { PrismaClient } from "@prisma/client";
import { DEFAULT_DB_URL } from "./paths.mjs";

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
    if (options.flushWal) {
      await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(FULL)");
    }
    return await prisma.user.count();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Arquivo novo / schema ainda não aplicado: tratar como vazio, não como leitura incerta.
    if (message.includes("does not exist in the current database") || message.includes("no such table")) {
      return 0;
    }
    console.warn("[db-count] Falha ao contar usuários:", databaseUrl, message);
    return -1;
  } finally {
    await prisma.$disconnect();
  }
}

export function productionDatabaseUrl() {
  if (process.env.NODE_ENV === "production") {
    process.env.DATABASE_URL = DEFAULT_DB_URL;
    return DEFAULT_DB_URL;
  }
  return process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db";
}

export function createProductionPrisma() {
  return new PrismaClient({
    datasources: { db: { url: productionDatabaseUrl() } },
  });
}

export async function withSqliteBusyTimeout(prisma) {
  try {
    await prisma.$executeRawUnsafe("PRAGMA busy_timeout = 10000");
  } catch {
    /* opcional */
  }
}
