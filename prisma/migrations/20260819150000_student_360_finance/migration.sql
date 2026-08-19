-- AlterTable
ALTER TABLE "Student" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "StudentFinanceAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "monthlyAmountCents" INTEGER NOT NULL DEFAULT 0,
    "dueDay" INTEGER NOT NULL DEFAULT 10,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "expectedInstallments" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentFinanceAccount_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentFinanceAccount_studentId_key" ON "StudentFinanceAccount"("studentId");

-- CreateTable
CREATE TABLE "TuitionPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'manual',
    "receiptCode" TEXT NOT NULL,
    "awardedXp" INTEGER NOT NULL DEFAULT 0,
    "awardedCoins" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TuitionPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StudentFinanceAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TuitionPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TuitionPayment_receiptCode_key" ON "TuitionPayment"("receiptCode");

-- CreateIndex
CREATE INDEX "TuitionPayment_studentId_paidAt_idx" ON "TuitionPayment"("studentId", "paidAt");
