import { PrismaClient } from "@prisma/client";
import { applyDurableDatabaseUrl } from "@/lib/database-mode";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const url = applyDurableDatabaseUrl();
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;
  if (cached) return cached;

  const client = createPrismaClient();
  // Um único cliente por processo: menos conexões perdidas e gravação estável no Postgres.
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = getPrismaClient();
