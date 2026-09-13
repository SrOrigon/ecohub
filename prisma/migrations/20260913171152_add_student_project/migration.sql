/*
  Warnings:

  - You are about to alter the column `completedAt` on the `DuelMatch` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `DuelMatch` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `DuelSession` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `expiresAt` on the `DuelSession` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.

*/
-- CreateTable
CREATE TABLE "StudentProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "projectUrl" TEXT,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentProject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentProject_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'present',
    "justificationNote" TEXT,
    "justifiedAt" DATETIME,
    "justifiedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_justifiedById_fkey" FOREIGN KEY ("justifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Attendance" ("classId", "createdAt", "date", "id", "justificationNote", "justifiedAt", "justifiedById", "status", "studentId") SELECT "classId", "createdAt", "date", "id", "justificationNote", "justifiedAt", "justifiedById", "status", "studentId" FROM "Attendance";
DROP TABLE "Attendance";
ALTER TABLE "new_Attendance" RENAME TO "Attendance";
CREATE INDEX "Attendance_classId_date_idx" ON "Attendance"("classId", "date");
CREATE UNIQUE INDEX "Attendance_studentId_date_key" ON "Attendance"("studentId", "date");
CREATE TABLE "new_Badge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'star',
    "xpRequired" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Badge_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Badge_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Badge" ("classId", "createdAt", "description", "icon", "id", "name", "schoolId", "xpRequired") SELECT "classId", "createdAt", "description", "icon", "id", "name", "schoolId", "xpRequired" FROM "Badge";
DROP TABLE "Badge";
ALTER TABLE "new_Badge" RENAME TO "Badge";
CREATE INDEX "Badge_schoolId_idx" ON "Badge"("schoolId");
CREATE INDEX "Badge_classId_idx" ON "Badge"("classId");
CREATE TABLE "new_DuelMatch" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "DuelMatch_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DuelSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DuelMatch_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DuelMatch_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DuelMatch" ("betCoins", "betXp", "challengedAnswersJson", "challengedId", "challengedScore", "challengerAnswersJson", "challengerId", "challengerScore", "classId", "completedAt", "createdAt", "id", "questionsJson", "schoolId", "sessionId", "status", "winnerId") SELECT "betCoins", "betXp", "challengedAnswersJson", "challengedId", "challengedScore", "challengerAnswersJson", "challengerId", "challengerScore", "classId", "completedAt", "createdAt", "id", "questionsJson", "schoolId", "sessionId", "status", "winnerId" FROM "DuelMatch";
DROP TABLE "DuelMatch";
ALTER TABLE "new_DuelMatch" RENAME TO "DuelMatch";
CREATE INDEX "DuelMatch_sessionId_idx" ON "DuelMatch"("sessionId");
CREATE INDEX "DuelMatch_classId_status_idx" ON "DuelMatch"("classId", "status");
CREATE INDEX "DuelMatch_challengerId_idx" ON "DuelMatch"("challengerId");
CREATE INDEX "DuelMatch_challengedId_idx" ON "DuelMatch"("challengedId");
CREATE TABLE "new_DuelSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxBetCoins" INTEGER NOT NULL DEFAULT 30,
    "maxBetXp" INTEGER NOT NULL DEFAULT 30,
    "pinCode" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_DuelSession" ("classId", "createdAt", "expiresAt", "id", "isActive", "maxBetCoins", "maxBetXp", "pinCode", "schoolId", "teacherId") SELECT "classId", "createdAt", "expiresAt", "id", "isActive", "maxBetCoins", "maxBetXp", "pinCode", "schoolId", "teacherId" FROM "DuelSession";
DROP TABLE "DuelSession";
ALTER TABLE "new_DuelSession" RENAME TO "DuelSession";
CREATE INDEX "DuelSession_classId_isActive_idx" ON "DuelSession"("classId", "isActive");
CREATE INDEX "DuelSession_schoolId_idx" ON "DuelSession"("schoolId");
CREATE TABLE "new_IssuedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'contract',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "contentHtml" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "contractNumber" TEXT,
    "contractStatus" TEXT NOT NULL DEFAULT 'vigente',
    "contractStartDate" DATETIME,
    "contractEndDate" DATETIME,
    "issuedById" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IssuedDocument_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssuedDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssuedDocument_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IssuedDocument_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_IssuedDocument" ("body", "classId", "contentHtml", "contractEndDate", "contractNumber", "contractStartDate", "contractStatus", "id", "issuedAt", "issuedById", "schoolId", "status", "studentId", "title", "type", "updatedAt") SELECT "body", "classId", "contentHtml", "contractEndDate", "contractNumber", "contractStartDate", "contractStatus", "id", "issuedAt", "issuedById", "schoolId", "status", "studentId", "title", "type", "updatedAt" FROM "IssuedDocument";
DROP TABLE "IssuedDocument";
ALTER TABLE "new_IssuedDocument" RENAME TO "IssuedDocument";
CREATE INDEX "IssuedDocument_schoolId_studentId_idx" ON "IssuedDocument"("schoolId", "studentId");
CREATE INDEX "IssuedDocument_studentId_status_idx" ON "IssuedDocument"("studentId", "status");
CREATE INDEX "IssuedDocument_schoolId_type_contractStatus_idx" ON "IssuedDocument"("schoolId", "type", "contractStatus");
CREATE INDEX "IssuedDocument_classId_idx" ON "IssuedDocument"("classId");
CREATE TABLE "new_School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cnpj" TEXT,
    "legalName" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "cnpjCheckedAt" DATETIME,
    "city" TEXT,
    "state" TEXT,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_School" ("city", "cnpj", "cnpjCheckedAt", "createdAt", "id", "legalName", "name", "settings", "slug", "state", "verificationStatus") SELECT "city", "cnpj", "cnpjCheckedAt", "createdAt", "id", "legalName", "name", "settings", "slug", "state", "verificationStatus" FROM "School";
DROP TABLE "School";
ALTER TABLE "new_School" RENAME TO "School";
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");
CREATE UNIQUE INDEX "School_cnpj_key" ON "School"("cnpj");
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "enrollmentCode" TEXT NOT NULL,
    "birthDate" DATETIME,
    "accessPinHash" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'standard',
    "provisionedById" TEXT,
    "classId" TEXT,
    "xpTotal" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "equippedFrame" TEXT,
    "equippedBackground" TEXT,
    "equippedPet" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Student_provisionedById_fkey" FOREIGN KEY ("provisionedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Student" ("accessPinHash", "accountType", "birthDate", "classId", "coins", "createdAt", "enrollmentCode", "equippedBackground", "equippedFrame", "equippedPet", "id", "level", "provisionedById", "status", "userId", "xpTotal") SELECT "accessPinHash", "accountType", "birthDate", "classId", "coins", "createdAt", "enrollmentCode", "equippedBackground", "equippedFrame", "equippedPet", "id", "level", "provisionedById", "status", "userId", "xpTotal" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");
CREATE UNIQUE INDEX "Student_enrollmentCode_key" ON "Student"("enrollmentCode");
CREATE INDEX "Student_classId_idx" ON "Student"("classId");
CREATE TABLE "new_StudentClassEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "enrolledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentClassEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StudentClassEnrollment" ("classId", "createdAt", "endedAt", "enrolledAt", "id", "notes", "status", "studentId", "updatedAt") SELECT "classId", "createdAt", "endedAt", "enrolledAt", "id", "notes", "status", "studentId", "updatedAt" FROM "StudentClassEnrollment";
DROP TABLE "StudentClassEnrollment";
ALTER TABLE "new_StudentClassEnrollment" RENAME TO "StudentClassEnrollment";
CREATE INDEX "StudentClassEnrollment_classId_status_idx" ON "StudentClassEnrollment"("classId", "status");
CREATE INDEX "StudentClassEnrollment_studentId_status_idx" ON "StudentClassEnrollment"("studentId", "status");
CREATE UNIQUE INDEX "StudentClassEnrollment_studentId_classId_key" ON "StudentClassEnrollment"("studentId", "classId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "StudentProject_schoolId_idx" ON "StudentProject"("schoolId");

-- CreateIndex
CREATE INDEX "StudentProject_studentId_idx" ON "StudentProject"("studentId");
