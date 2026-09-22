-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "dropoutRiskScore" INTEGER NOT NULL DEFAULT 0,
    "dropoutRiskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "dropoutFactors" TEXT NOT NULL DEFAULT '[]',
    "lastRiskAssessment" DATETIME,
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
