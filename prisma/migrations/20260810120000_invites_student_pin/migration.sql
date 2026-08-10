-- AlterTable
ALTER TABLE "Student" ADD COLUMN "accessPinHash" TEXT;
ALTER TABLE "Student" ADD COLUMN "accountType" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "Student" ADD COLUMN "provisionedById" TEXT;

-- CreateTable
CREATE TABLE "TeacherInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "invitedById" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "usedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherInvite_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherInvite_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherInvite_token_key" ON "TeacherInvite"("token");
CREATE INDEX "TeacherInvite_schoolId_idx" ON "TeacherInvite"("schoolId");
CREATE INDEX "TeacherInvite_token_idx" ON "TeacherInvite"("token");
CREATE INDEX "Student_provisionedById_idx" ON "Student"("provisionedById");
