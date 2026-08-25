/**
 * Garante colunas e tabelas críticas no PostgreSQL quando migrate deploy falhou
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

/** Colunas de Student ausentes em produção quebram cadastro de aluno (P2022). */
const STUDENT_COLUMN_PATCHES = [
  `ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3)`,
  `ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "accessPinHash" TEXT`,
  `ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "accountType" TEXT NOT NULL DEFAULT 'standard'`,
  `ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "provisionedById" TEXT`,
  `ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "equippedFrame" TEXT`,
  `ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "equippedBackground" TEXT`,
  `ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "equippedPet" TEXT`,
  `ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active'`,
];

const REWARD_COLUMN_PATCHES = [
  `ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "itemType" TEXT NOT NULL DEFAULT 'physical'`,
  `ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "cosmeticKey" TEXT`,
];

const EXERCISE_COLUMN_PATCHES = [
  `ALTER TABLE "ExerciseQuestion" ADD COLUMN IF NOT EXISTS "xpReward" INTEGER NOT NULL DEFAULT 0`,
];

const TABLE_PATCHES = [
  `CREATE TABLE IF NOT EXISTS "AppMeta" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "StudentActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentActivity_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "StudentFinanceAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "monthlyAmountCents" INTEGER NOT NULL DEFAULT 0,
    "dueDay" INTEGER NOT NULL DEFAULT 10,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedInstallments" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentFinanceAccount_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "TuitionPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'manual',
    "receiptCode" TEXT NOT NULL,
    "awardedXp" INTEGER NOT NULL DEFAULT 0,
    "awardedCoins" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TuitionPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StudentFinanceAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TuitionPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "TeacherInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherInvite_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherInvite_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
];

const INDEX_PATCHES = [
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`,
  `CREATE INDEX IF NOT EXISTS "Student_provisionedById_idx" ON "Student"("provisionedById")`,
  `CREATE INDEX IF NOT EXISTS "StudentActivity_studentId_occurredAt_idx" ON "StudentActivity"("studentId", "occurredAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StudentFinanceAccount_studentId_key" ON "StudentFinanceAccount"("studentId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TuitionPayment_receiptCode_key" ON "TuitionPayment"("receiptCode")`,
  `CREATE INDEX IF NOT EXISTS "TuitionPayment_studentId_paidAt_idx" ON "TuitionPayment"("studentId", "paidAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TeacherInvite_token_key" ON "TeacherInvite"("token")`,
  `CREATE INDEX IF NOT EXISTS "TeacherInvite_schoolId_idx" ON "TeacherInvite"("schoolId")`,
  `CREATE INDEX IF NOT EXISTS "TeacherInvite_token_idx" ON "TeacherInvite"("token")`,
  `CREATE INDEX IF NOT EXISTS "RewardRedemption_status_idx" ON "RewardRedemption"("status")`,
];

const ALL_PATCHES = [
  ...TABLE_PATCHES,
  ...USER_COLUMN_PATCHES,
  ...STUDENT_COLUMN_PATCHES,
  ...REWARD_COLUMN_PATCHES,
  ...EXERCISE_COLUMN_PATCHES,
  ...INDEX_PATCHES,
];

/** Colunas mínimas para cadastro de aluno funcionar. */
const CRITICAL_COLUMNS = [
  { table: "User", column: "displayName" },
  { table: "User", column: "username" },
  { table: "Student", column: "accessPinHash" },
  { table: "Student", column: "accountType" },
  { table: "Student", column: "status" },
];

async function columnExists(prisma, table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 AS ok
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    table,
    column
  );
  return Array.isArray(rows) && rows.length > 0;
}

export async function verifyPostgresSchema(databaseUrl = process.env.DATABASE_URL) {
  if (!isPostgresUrl(databaseUrl)) {
    return { ok: true, missing: [] };
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  const missing = [];
  try {
    for (const { table, column } of CRITICAL_COLUMNS) {
      const exists = await columnExists(prisma, table, column);
      if (!exists) missing.push(`${table}.${column}`);
    }
    return { ok: missing.length === 0, missing };
  } finally {
    await prisma.$disconnect();
  }
}

export async function ensurePostgresSchema(databaseUrl = process.env.DATABASE_URL) {
  if (!isPostgresUrl(databaseUrl)) {
    return { patched: false, reason: "not-postgres" };
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  let applied = 0;
  let warnings = 0;
  try {
    for (const sql of ALL_PATCHES) {
      try {
        await prisma.$executeRawUnsafe(sql);
        applied += 1;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.toLowerCase().includes("already exists")) {
          console.warn("[ecohub] patch schema:", msg);
          warnings += 1;
        }
      }
    }

    const verification = await verifyPostgresSchema(databaseUrl);
    if (!verification.ok) {
      console.error("[ecohub] PostgreSQL ainda incompleto após patch:", verification.missing.join(", "));
    } else {
      console.log(`[ecohub] PostgreSQL schema patch: ${applied} comando(s), colunas críticas OK.`);
    }

    return { patched: true, applied, warnings, ...verification };
  } finally {
    await prisma.$disconnect();
  }
}
