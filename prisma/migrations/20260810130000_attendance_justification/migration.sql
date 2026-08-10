-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN "justificationNote" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "justifiedAt" DATETIME;
ALTER TABLE "Attendance" ADD COLUMN "justifiedById" TEXT;
