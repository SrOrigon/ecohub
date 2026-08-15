-- Colunas presentes no schema Prisma mas ausentes nas migrations anteriores.
-- Sem elas, cadastro de aluno e recompensas padrão falham em produção.

-- Student: cosméticos equipáveis na loja
ALTER TABLE "Student" ADD COLUMN "equippedFrame" TEXT;
ALTER TABLE "Student" ADD COLUMN "equippedBackground" TEXT;

-- Reward: tipos de item (físico vs cosmético)
ALTER TABLE "Reward" ADD COLUMN "itemType" TEXT NOT NULL DEFAULT 'physical';
ALTER TABLE "Reward" ADD COLUMN "cosmeticKey" TEXT;

-- ExerciseQuestion: XP por questão
ALTER TABLE "ExerciseQuestion" ADD COLUMN "xpReward" INTEGER NOT NULL DEFAULT 0;

-- Índice de status em resgates (consultas do painel)
CREATE INDEX "RewardRedemption_status_idx" ON "RewardRedemption"("status");
