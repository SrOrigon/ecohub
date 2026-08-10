-- CreateTable
CREATE TABLE "ClassGroupCoTeacher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassGroupCoTeacher_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassGroupCoTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassGroupCoTeacher_classId_teacherId_key" ON "ClassGroupCoTeacher"("classId", "teacherId");
CREATE INDEX "ClassGroupCoTeacher_teacherId_idx" ON "ClassGroupCoTeacher"("teacherId");
