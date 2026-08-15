import { PrismaClient } from "@prisma/client";
import { PRODUCTION_DATABASE_URL } from "@/lib/production-database";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function resolveDatabaseUrl(): string {
  if (process.env.NODE_ENV === "production") {
    process.env.DATABASE_URL = PRODUCTION_DATABASE_URL;
    return PRODUCTION_DATABASE_URL;
  }
  return process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db";
}

function createPrismaClient() {
  const url = resolveDatabaseUrl();
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;
  if (cached && "notification" in cached) return cached;

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();
