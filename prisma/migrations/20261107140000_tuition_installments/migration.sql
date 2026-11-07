CREATE TABLE "TuitionInstallment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paymentMethod" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TuitionInstallment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StudentFinanceAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TuitionInstallment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TuitionInstallment_accountId_sequence_key" ON "TuitionInstallment"("accountId", "sequence");
CREATE INDEX "TuitionInstallment_studentId_dueDate_idx" ON "TuitionInstallment"("studentId", "dueDate");

ALTER TABLE "TuitionPayment" ADD COLUMN "installmentId" TEXT;
CREATE INDEX "TuitionPayment_installmentId_idx" ON "TuitionPayment"("installmentId");
