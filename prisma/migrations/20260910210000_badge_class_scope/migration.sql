-- AlterTable
ALTER TABLE "Badge" ADD COLUMN "classId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Badge_schoolId_idx" ON "Badge"("schoolId");
CREATE INDEX IF NOT EXISTS "Badge_classId_idx" ON "Badge"("classId");
