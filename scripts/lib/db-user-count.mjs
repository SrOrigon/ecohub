import { PrismaClient } from "@prisma/client";
import { DEFAULT_DB_URL } from "./lib/paths.mjs";

/**
 * Conta usuários em um banco SQLite via Prisma (URL explícita).
 * Retorna -1 se não foi possível ler (evita restauração destrutiva).
 */
export async function countUsersInDatabase(databaseUrl) {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(FULL)");
    return await prisma.user.count();
  } catch (error) {
    console.warn(
      "[db-count] Falha ao contar usuários:",
      databaseUrl,
      error instanceof Error ? error.message : error
    );
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
