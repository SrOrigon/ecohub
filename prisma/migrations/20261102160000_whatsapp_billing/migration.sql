-- AlterTable
ALTER TABLE "SchoolPaymentConfig" ADD COLUMN "whatsappBillingEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SchoolPaymentConfig" ADD COLUMN "whatsappRemindDaysBefore" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "SchoolPaymentConfig" ADD COLUMN "whatsappPhoneNumberId" TEXT;
ALTER TABLE "SchoolPaymentConfig" ADD COLUMN "encryptedWhatsappToken" TEXT;

-- CreateTable
CREATE TABLE "WhatsAppBillingLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "invoiceKind" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppBillingLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WhatsAppBillingLog_schoolId_createdAt_idx" ON "WhatsAppBillingLog"("schoolId", "createdAt");
CREATE INDEX "WhatsAppBillingLog_invoiceId_idx" ON "WhatsAppBillingLog"("invoiceId");
CREATE INDEX "WhatsAppBillingLog_studentId_idx" ON "WhatsAppBillingLog"("studentId");
