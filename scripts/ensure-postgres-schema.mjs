/**
 * Garante colunas e tabelas críticas no PostgreSQL quando migrate deploy falhou
 * (migrations geradas para SQLite não aplicam no Railway).
 */
import { PrismaClient } from "@prisma/client";
import { isPostgresUrl } from "./lib/database-mode.mjs";

const USER_COLUMN_PATCHES = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "state" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "street" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "streetNumber" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "addressComplement" TEXT`,
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
  `ALTER TABLE "Exercise" ADD COLUMN IF NOT EXISTS "audienceType" TEXT NOT NULL DEFAULT 'class'`,
  `ALTER TABLE "Exercise" ADD COLUMN IF NOT EXISTS "personalizationTag" TEXT`,
  `CREATE TABLE IF NOT EXISTS "ExerciseStudentTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseStudentTarget_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExerciseStudentTarget_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ExerciseStudentTarget_exerciseId_studentId_key" ON "ExerciseStudentTarget"("exerciseId", "studentId")`,
  `CREATE INDEX IF NOT EXISTS "ExerciseStudentTarget_studentId_idx" ON "ExerciseStudentTarget"("studentId")`,
  `CREATE INDEX IF NOT EXISTS "ExerciseStudentTarget_exerciseId_idx" ON "ExerciseStudentTarget"("exerciseId")`,
  `CREATE INDEX IF NOT EXISTS "Exercise_audienceType_idx" ON "Exercise"("audienceType")`,
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
  `CREATE TABLE IF NOT EXISTS "StudentProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "projectUrl" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentProject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentProject_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "diffBefore" TEXT DEFAULT '{}',
    "diffAfter" TEXT DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pixQrCode" TEXT,
    "pixCopyPaste" TEXT,
    "externalInvoiceId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "SchoolPaymentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL UNIQUE,
    "providerType" TEXT NOT NULL DEFAULT 'MANUAL_PIX',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pixKey" TEXT,
    "pixKeyType" TEXT,
    "beneficiaryName" TEXT,
    "bankName" TEXT,
    "encryptedApiKey" TEXT,
    "encryptedApiSecret" TEXT,
    "webhookSecret" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchoolPaymentConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "StudentInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethodId" TEXT,
    "pixQrCodeBase64" TEXT,
    "pixCopyPaste" TEXT,
    "externalInvoiceId" TEXT,
    "proofAttachmentUrl" TEXT,
    "proofUploadedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentInvoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentInvoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentInvoice_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "SchoolPaymentConfig" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudentInvoice_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
  `CREATE INDEX IF NOT EXISTS "StudentProject_schoolId_idx" ON "StudentProject"("schoolId")`,
  `CREATE INDEX IF NOT EXISTS "StudentProject_studentId_idx" ON "StudentProject"("studentId")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_schoolId_createdAt_idx" ON "AuditLog"("schoolId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId")`,
  `CREATE INDEX IF NOT EXISTS "Invoice_schoolId_status_idx" ON "Invoice"("schoolId", "status")`,
  `CREATE INDEX IF NOT EXISTS "Invoice_studentId_status_idx" ON "Invoice"("studentId", "status")`,
  `CREATE INDEX IF NOT EXISTS "Invoice_externalInvoiceId_idx" ON "Invoice"("externalInvoiceId")`,
  `CREATE INDEX IF NOT EXISTS "SchoolPaymentConfig_providerType_idx" ON "SchoolPaymentConfig"("providerType")`,
  `CREATE INDEX IF NOT EXISTS "StudentInvoice_schoolId_status_idx" ON "StudentInvoice"("schoolId", "status")`,
  `CREATE INDEX IF NOT EXISTS "StudentInvoice_studentId_status_idx" ON "StudentInvoice"("studentId", "status")`,
  `CREATE INDEX IF NOT EXISTS "StudentInvoice_externalInvoiceId_idx" ON "StudentInvoice"("externalInvoiceId")`,
  `CREATE INDEX IF NOT EXISTS "StudentInvoice_paymentMethodId_idx" ON "StudentInvoice"("paymentMethodId")`,
];

const DOCUMENT_AND_ENROLLMENT_PATCHES = [
  `ALTER TABLE "IssuedDocument" ADD COLUMN IF NOT EXISTS "contentHtml" TEXT`,
  `ALTER TABLE "IssuedDocument" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'final'`,
  `ALTER TABLE "IssuedDocument" ADD COLUMN IF NOT EXISTS "contractNumber" TEXT`,
  `ALTER TABLE "IssuedDocument" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE "IssuedDocument" ADD COLUMN IF NOT EXISTS "classId" TEXT`,
  `ALTER TABLE "IssuedDocument" ADD COLUMN IF NOT EXISTS "contractStatus" TEXT NOT NULL DEFAULT 'vigente'`,
  `ALTER TABLE "IssuedDocument" ADD COLUMN IF NOT EXISTS "contractStartDate" TIMESTAMP(3)`,
  `ALTER TABLE "IssuedDocument" ADD COLUMN IF NOT EXISTS "contractEndDate" TIMESTAMP(3)`,
  `CREATE TABLE IF NOT EXISTS "StudentClassEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentClassEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StudentClassEnrollment_studentId_classId_key" ON "StudentClassEnrollment"("studentId", "classId")`,
  `CREATE INDEX IF NOT EXISTS "StudentClassEnrollment_classId_status_idx" ON "StudentClassEnrollment"("classId", "status")`,
  `CREATE INDEX IF NOT EXISTS "StudentClassEnrollment_studentId_status_idx" ON "StudentClassEnrollment"("studentId", "status")`,
  `CREATE INDEX IF NOT EXISTS "IssuedDocument_schoolId_type_contractStatus_idx" ON "IssuedDocument"("schoolId", "type", "contractStatus")`,
  `CREATE INDEX IF NOT EXISTS "IssuedDocument_classId_idx" ON "IssuedDocument"("classId")`,
  `INSERT INTO "StudentClassEnrollment" ("id", "studentId", "classId", "status", "enrolledAt", "createdAt", "updatedAt")
   SELECT "id" || ':' || "classId", "id", "classId", 'active', COALESCE("createdAt", CURRENT_TIMESTAMP), COALESCE("createdAt", CURRENT_TIMESTAMP), COALESCE("createdAt", CURRENT_TIMESTAMP)
   FROM "Student"
   WHERE "classId" IS NOT NULL
   ON CONFLICT ("studentId", "classId") DO NOTHING`,
];

const DUEL_TABLE_PATCHES = [
  `CREATE TABLE IF NOT EXISTS "DuelSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxBetCoins" INTEGER NOT NULL DEFAULT 30,
    "maxBetXp" INTEGER NOT NULL DEFAULT 30,
    "pinCode" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "DuelSession_classId_isActive_idx" ON "DuelSession"("classId", "isActive")`,
  `CREATE INDEX IF NOT EXISTS "DuelSession_schoolId_idx" ON "DuelSession"("schoolId")`,
  `CREATE TABLE IF NOT EXISTS "DuelMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sessionId" TEXT,
    "challengerId" TEXT NOT NULL,
    "challengedId" TEXT NOT NULL,
    "betCoins" INTEGER NOT NULL DEFAULT 0,
    "betXp" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "winnerId" TEXT,
    "questionsJson" TEXT NOT NULL DEFAULT '[]',
    "challengerAnswersJson" TEXT NOT NULL DEFAULT '[]',
    "challengedAnswersJson" TEXT NOT NULL DEFAULT '[]',
    "challengerScore" INTEGER NOT NULL DEFAULT 0,
    "challengedScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "DuelMatch_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DuelSession"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DuelMatch_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DuelMatch_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "DuelMatch_sessionId_idx" ON "DuelMatch"("sessionId")`,
  `CREATE INDEX IF NOT EXISTS "DuelMatch_classId_status_idx" ON "DuelMatch"("classId", "status")`,
  `CREATE INDEX IF NOT EXISTS "DuelMatch_challengerId_idx" ON "DuelMatch"("challengerId")`,
  `CREATE INDEX IF NOT EXISTS "DuelMatch_challengedId_idx" ON "DuelMatch"("challengedId")`,
];

const BADGE_COLUMN_PATCHES = [
  `ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "classId" TEXT`,
  `ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "courseId" TEXT`,
  `ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`,
  `ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "coinsReward" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "ClassGroup" ADD COLUMN IF NOT EXISTS "courseId" TEXT`,
  `CREATE TABLE IF NOT EXISTS "BadgeClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "badgeId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BadgeClass_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BadgeClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "BadgeClass_badgeId_classId_key" ON "BadgeClass"("badgeId", "classId")`,
  `CREATE INDEX IF NOT EXISTS "BadgeClass_badgeId_idx" ON "BadgeClass"("badgeId")`,
  `CREATE INDEX IF NOT EXISTS "BadgeClass_classId_idx" ON "BadgeClass"("classId")`,
  `CREATE INDEX IF NOT EXISTS "Badge_schoolId_idx" ON "Badge"("schoolId")`,
  `CREATE INDEX IF NOT EXISTS "Badge_classId_idx" ON "Badge"("classId")`,
  `CREATE INDEX IF NOT EXISTS "Badge_courseId_idx" ON "Badge"("courseId")`,
  `CREATE INDEX IF NOT EXISTS "ClassGroup_courseId_idx" ON "ClassGroup"("courseId")`,
];

const ALL_PATCHES = [
  ...TABLE_PATCHES,
  ...DUEL_TABLE_PATCHES,
  ...USER_COLUMN_PATCHES,
  ...STUDENT_COLUMN_PATCHES,
  ...REWARD_COLUMN_PATCHES,
  ...EXERCISE_COLUMN_PATCHES,
  ...DOCUMENT_AND_ENROLLMENT_PATCHES,
  ...BADGE_COLUMN_PATCHES,
  ...INDEX_PATCHES,
];

/** Colunas mínimas para cadastro de aluno funcionar. */
const CRITICAL_COLUMNS = [
  { table: "User", column: "displayName" },
  { table: "User", column: "username" },
  { table: "User", column: "interests" },
  { table: "User", column: "socialLinks" },
  { table: "Student", column: "birthDate" },
  { table: "Student", column: "accessPinHash" },
  { table: "Student", column: "accountType" },
  { table: "Student", column: "status" },
  { table: "Exercise", column: "audienceType" },
  { table: "Badge", column: "classId" },
];

const CRITICAL_TABLES = [
  "ExerciseStudentTarget",
  "StudentClassEnrollment",
  "DuelSession",
  "DuelMatch",
  "StudentProject",
  "BadgeClass",
  "AuditLog",
  "Invoice",
  "SchoolPaymentConfig",
  "StudentInvoice",
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

async function tableExists(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 AS ok
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = $1
     LIMIT 1`,
    table
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
    for (const table of CRITICAL_TABLES) {
      const exists = await tableExists(prisma, table);
      if (!exists) missing.push(`table:${table}`);
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
      console.warn("[ecohub] PostgreSQL incompleto após patch — reaplicando patches de exercício...");
      for (const sql of EXERCISE_COLUMN_PATCHES) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch {
          /* ignore */
        }
      }
      const retry = await verifyPostgresSchema(databaseUrl);
      if (!retry.ok) {
        console.error("[ecohub] PostgreSQL ainda incompleto após patch:", retry.missing.join(", "));
      } else {
        console.log("[ecohub] PostgreSQL schema patch: colunas de exercício corrigidas.");
      }
      return { patched: true, applied, warnings, ...retry };
    } else {
      console.log(`[ecohub] PostgreSQL schema patch: ${applied} comando(s), colunas críticas OK.`);
    }

    return { patched: true, applied, warnings, ...verification };
  } finally {
    await prisma.$disconnect();
  }
}
