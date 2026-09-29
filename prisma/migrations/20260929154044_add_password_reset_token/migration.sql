-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CardMachineConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "serialNumber" TEXT,
    "debitFeePercent" REAL NOT NULL DEFAULT 1.5,
    "creditSightFeePercent" REAL NOT NULL DEFAULT 2.5,
    "creditInstallmentFeePercent" REAL NOT NULL DEFAULT 3.8,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CardMachineConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CardMachineConfig" ("createdAt", "creditInstallmentFeePercent", "creditSightFeePercent", "debitFeePercent", "id", "isActive", "machineName", "provider", "schoolId", "serialNumber", "updatedAt") SELECT "createdAt", "creditInstallmentFeePercent", "creditSightFeePercent", "debitFeePercent", "id", "isActive", "machineName", "provider", "schoolId", "serialNumber", "updatedAt" FROM "CardMachineConfig";
DROP TABLE "CardMachineConfig";
ALTER TABLE "new_CardMachineConfig" RENAME TO "CardMachineConfig";
CREATE INDEX "CardMachineConfig_schoolId_idx" ON "CardMachineConfig"("schoolId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
