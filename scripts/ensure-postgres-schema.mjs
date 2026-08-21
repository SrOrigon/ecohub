/**
 * Garante colunas críticas no PostgreSQL quando migrate deploy falhou
 * (migrations geradas para SQLite não aplicam no Railway).
 */
import { PrismaClient } from "@prisma/client";
import { isPostgresUrl } from "./lib/database-mode.mjs";

const USER_COLUMN_PATCHES = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "state" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayName" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pronouns" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "interests" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "socialLinks" TEXT NOT NULL DEFAULT '{}'`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "zipCode" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION`,
];

const INDEX_PATCHES = [
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`,
];

const TABLE_PATCHES = [
  `CREATE TABLE IF NOT EXISTS "AppMeta" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

export async function ensurePostgresSchema(databaseUrl = process.env.DATABASE_URL) {
  if (!isPostgresUrl(databaseUrl)) {
    return { patched: false, reason: "not-postgres" };
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  let applied = 0;
  try {
    for (const sql of [...TABLE_PATCHES, ...USER_COLUMN_PATCHES, ...INDEX_PATCHES]) {
      try {
        await prisma.$executeRawUnsafe(sql);
        applied += 1;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.toLowerCase().includes("already exists")) {
          console.warn("[ecohub] patch schema:", msg);
        }
      }
    }
    console.log(`[ecohub] PostgreSQL schema patch: ${applied} comando(s) aplicado(s).`);
    return { patched: true, applied };
  } finally {
    await prisma.$disconnect();
  }
}
