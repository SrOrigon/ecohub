-- CreateTable
CREATE TABLE "StudentClassEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "enrolledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentClassEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StudentClassEnrollment_studentId_classId_key" ON "StudentClassEnrollment"("studentId", "classId");
CREATE INDEX "StudentClassEnrollment_classId_status_idx" ON "StudentClassEnrollment"("classId", "status");
CREATE INDEX "StudentClassEnrollment_studentId_status_idx" ON "StudentClassEnrollment"("studentId", "status");

-- Backfill enrollments from legacy single-class field
INSERT INTO "StudentClassEnrollment" ("id", "studentId", "classId", "status", "enrolledAt", "createdAt", "updatedAt")
SELECT
    "id" || ':' || "classId",
    "id",
    "classId",
    'active',
    COALESCE("createdAt", CURRENT_TIMESTAMP),
    COALESCE("createdAt", CURRENT_TIMESTAMP),
    COALESCE("createdAt", CURRENT_TIMESTAMP)
FROM "Student"
WHERE "classId" IS NOT NULL;
