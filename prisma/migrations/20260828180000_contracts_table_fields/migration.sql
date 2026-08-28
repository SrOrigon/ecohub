-- AlterTable
ALTER TABLE "IssuedDocument" ADD COLUMN "classId" TEXT;
ALTER TABLE "IssuedDocument" ADD COLUMN "contractStatus" TEXT NOT NULL DEFAULT 'vigente';
ALTER TABLE "IssuedDocument" ADD COLUMN "contractStartDate" DATETIME;
ALTER TABLE "IssuedDocument" ADD COLUMN "contractEndDate" DATETIME;

UPDATE "IssuedDocument" SET "contractStartDate" = "issuedAt" WHERE "contractStartDate" IS NULL;
UPDATE "IssuedDocument" SET "contractStatus" = CASE WHEN "status" = 'draft' THEN 'rascunho' ELSE 'vigente' END;

CREATE INDEX "IssuedDocument_schoolId_type_contractStatus_idx" ON "IssuedDocument"("schoolId", "type", "contractStatus");
CREATE INDEX "IssuedDocument_classId_idx" ON "IssuedDocument"("classId");
