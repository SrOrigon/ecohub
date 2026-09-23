-- CreateTable
CREATE TABLE IF NOT EXISTS "CardMachineConfig" (
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
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardMachineConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "StudentInvoice" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "StudentInvoice" ADD COLUMN "cardMachineId" TEXT;
ALTER TABLE "StudentInvoice" ADD COLUMN "netAmountCents" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CardMachineConfig_schoolId_idx" ON "CardMachineConfig"("schoolId");
