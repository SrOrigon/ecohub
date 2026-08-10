-- AlterTable
ALTER TABLE "School" ADD COLUMN "cnpj" TEXT;
ALTER TABLE "School" ADD COLUMN "legalName" TEXT;
ALTER TABLE "School" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'verified';
ALTER TABLE "School" ADD COLUMN "cnpjCheckedAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "School_cnpj_key" ON "School"("cnpj");
