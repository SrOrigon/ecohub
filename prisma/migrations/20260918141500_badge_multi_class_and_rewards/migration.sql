-- AlterTable
ALTER TABLE "ClassGroup" ADD COLUMN "courseId" TEXT;

-- CreateTable
CREATE TABLE "BadgeClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "badgeId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BadgeClass_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BadgeClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Badge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "courseId" TEXT,
    "classId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'star',
    "imageUrl" TEXT,
    "xpRequired" INTEGER NOT NULL DEFAULT 0,
    "coinsReward" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Badge_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Badge_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Badge" ("classId", "createdAt", "description", "icon", "id", "name", "schoolId", "xpRequired") SELECT "classId", "createdAt", "description", "icon", "id", "name", "schoolId", "xpRequired" FROM "Badge";
DROP TABLE "Badge";
ALTER TABLE "new_Badge" RENAME TO "Badge";
CREATE INDEX "Badge_schoolId_idx" ON "Badge"("schoolId");
CREATE INDEX "Badge_classId_idx" ON "Badge"("classId");
CREATE INDEX "Badge_courseId_idx" ON "Badge"("courseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BadgeClass_badgeId_idx" ON "BadgeClass"("badgeId");

-- CreateIndex
CREATE INDEX "BadgeClass_classId_idx" ON "BadgeClass"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeClass_badgeId_classId_key" ON "BadgeClass"("badgeId", "classId");

-- CreateIndex
CREATE INDEX "ClassGroup_courseId_idx" ON "ClassGroup"("courseId");
