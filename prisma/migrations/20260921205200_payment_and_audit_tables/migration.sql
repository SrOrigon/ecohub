-- CreateTable
CREATE TABLE "AuditLog" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pixQrCode" TEXT,
    "pixCopyPaste" TEXT,
    "externalInvoiceId" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchoolPaymentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SchoolPaymentConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethodId" TEXT,
    "pixQrCodeBase64" TEXT,
    "pixCopyPaste" TEXT,
    "externalInvoiceId" TEXT,
    "proofAttachmentUrl" TEXT,
    "proofUploadedAt" DATETIME,
    "paidAt" DATETIME,
    "verifiedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentInvoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentInvoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentInvoice_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "SchoolPaymentConfig" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudentInvoice_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AuditLog_schoolId_createdAt_idx" ON "AuditLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Invoice_schoolId_status_idx" ON "Invoice"("schoolId", "status");

-- CreateIndex
CREATE INDEX "Invoice_studentId_status_idx" ON "Invoice"("studentId", "status");

-- CreateIndex
CREATE INDEX "Invoice_externalInvoiceId_idx" ON "Invoice"("externalInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolPaymentConfig_schoolId_key" ON "SchoolPaymentConfig"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolPaymentConfig_providerType_idx" ON "SchoolPaymentConfig"("providerType");

-- CreateIndex
CREATE INDEX "StudentInvoice_schoolId_status_idx" ON "StudentInvoice"("schoolId", "status");

-- CreateIndex
CREATE INDEX "StudentInvoice_studentId_status_idx" ON "StudentInvoice"("studentId", "status");

-- CreateIndex
CREATE INDEX "StudentInvoice_externalInvoiceId_idx" ON "StudentInvoice"("externalInvoiceId");

-- CreateIndex
CREATE INDEX "StudentInvoice_paymentMethodId_idx" ON "StudentInvoice"("paymentMethodId");
