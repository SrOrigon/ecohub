-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN "audienceType" TEXT NOT NULL DEFAULT 'class';
ALTER TABLE "Exercise" ADD COLUMN "personalizationTag" TEXT;

-- CreateTable
CREATE TABLE "ExerciseStudentTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseStudentTarget_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExerciseStudentTarget_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseStudentTarget_exerciseId_studentId_key" ON "ExerciseStudentTarget"("exerciseId", "studentId");
CREATE INDEX "ExerciseStudentTarget_studentId_idx" ON "ExerciseStudentTarget"("studentId");
CREATE INDEX "ExerciseStudentTarget_exerciseId_idx" ON "ExerciseStudentTarget"("exerciseId");
CREATE INDEX "Exercise_audienceType_idx" ON "Exercise"("audienceType");
