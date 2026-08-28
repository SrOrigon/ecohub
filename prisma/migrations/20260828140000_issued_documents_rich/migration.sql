-- AlterTable
ALTER TABLE "IssuedDocument" ADD COLUMN "contentHtml" TEXT;
ALTER TABLE "IssuedDocument" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'final';
ALTER TABLE "IssuedDocument" ADD COLUMN "contractNumber" TEXT;
ALTER TABLE "IssuedDocument" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill rich content from legacy plain body
UPDATE "IssuedDocument" SET "contentHtml" = '<p>' || replace(replace("body", '&', '&amp;'), '\n', '</p><p>') || '</p>' WHERE "contentHtml" IS NULL;

CREATE INDEX "IssuedDocument_schoolId_studentId_idx" ON "IssuedDocument"("schoolId", "studentId");
CREATE INDEX "IssuedDocument_studentId_status_idx" ON "IssuedDocument"("studentId", "status");
