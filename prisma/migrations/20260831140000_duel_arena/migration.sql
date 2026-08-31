-- Arena de Duelos 1v1 (sessão do professor + partidas entre alunos)
CREATE TABLE IF NOT EXISTS "DuelSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxBetCoins" INTEGER NOT NULL DEFAULT 30,
    "maxBetXp" INTEGER NOT NULL DEFAULT 30,
    "pinCode" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "DuelSession_classId_isActive_idx" ON "DuelSession"("classId", "isActive");
CREATE INDEX IF NOT EXISTS "DuelSession_schoolId_idx" ON "DuelSession"("schoolId");

CREATE TABLE IF NOT EXISTS "DuelMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sessionId" TEXT,
    "challengerId" TEXT NOT NULL,
    "challengedId" TEXT NOT NULL,
    "betCoins" INTEGER NOT NULL DEFAULT 0,
    "betXp" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "winnerId" TEXT,
    "questionsJson" TEXT NOT NULL DEFAULT '[]',
    "challengerAnswersJson" TEXT NOT NULL DEFAULT '[]',
    "challengedAnswersJson" TEXT NOT NULL DEFAULT '[]',
    "challengerScore" INTEGER NOT NULL DEFAULT 0,
    "challengedScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "DuelMatch_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DuelSession"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DuelMatch_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DuelMatch_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DuelMatch_sessionId_idx" ON "DuelMatch"("sessionId");
CREATE INDEX IF NOT EXISTS "DuelMatch_classId_status_idx" ON "DuelMatch"("classId", "status");
CREATE INDEX IF NOT EXISTS "DuelMatch_challengerId_idx" ON "DuelMatch"("challengerId");
CREATE INDEX IF NOT EXISTS "DuelMatch_challengedId_idx" ON "DuelMatch"("challengedId");
