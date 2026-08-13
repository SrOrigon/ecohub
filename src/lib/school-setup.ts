import { prisma } from "@/lib/db";

export async function ensureDefaultBadges(schoolId: string) {
  const count = await prisma.badge.count({ where: { schoolId } });
  if (count > 0) return;

  await prisma.badge.createMany({
    data: [
      { schoolId, name: "Pontualidade", description: "30 dias sem faltas", icon: "clock", xpRequired: 500 },
      { schoolId, name: "Estudante Estrela", description: "Média acima de 9.0", icon: "star", xpRequired: 1000 },
      { schoolId, name: "Missão Completa", description: "5 missões concluídas", icon: "target", xpRequired: 750 },
    ],
  });
}

export async function ensureDefaultRewardCategories(schoolId: string) {
  const count = await prisma.rewardCategory.count({ where: { schoolId } });
  if (count > 0) return;

  await prisma.rewardCategory.createMany({
    data: [
      { schoolId, name: "Lanches", description: "Itens da cantina e vale-lanches", sortOrder: 1 },
      { schoolId, name: "Material escolar", description: "Canetas, cadernos e kits", sortOrder: 2 },
      { schoolId, name: "Benefícios", description: "Pontos extras, intervalos e vantagens", sortOrder: 3 },
      { schoolId, name: "Merchandising", description: "Camisetas e produtos da escola", sortOrder: 4 },
    ],
  });
}

export async function ensureDefaultRewards(schoolId: string) {
  await ensureDefaultRewardCategories(schoolId);

  const count = await prisma.reward.count({ where: { schoolId } });
  if (count > 0) return;

  const categories = await prisma.rewardCategory.findMany({ where: { schoolId } });
  const byName = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  await prisma.reward.createMany({
    data: [
      {
        schoolId,
        categoryId: byName["Material escolar"],
        name: "Caneta Ecohub",
        description: "Caneta personalizada da escola",
        coinCost: 50,
        stock: 20,
      },
      {
        schoolId,
        categoryId: byName["Benefícios"],
        name: "1 ponto extra",
        description: "Bônus de 1 ponto em qualquer disciplina",
        coinCost: 150,
        stock: 10,
      },
      {
        schoolId,
        categoryId: byName["Benefícios"],
        name: "Intervalo estendido",
        description: "15 min extras no intervalo (1x por mês)",
        coinCost: 200,
        stock: 5,
      },
      {
        schoolId,
        categoryId: byName["Merchandising"],
        name: "Camiseta da turma",
        description: "Camiseta exclusiva da turma",
        coinCost: 500,
        stock: 3,
      },
      {
        schoolId,
        categoryId: byName["Lanches"],
        name: "Vale-lanche",
        description: "Vale lanche na cantina",
        coinCost: 80,
        stock: null,
      },
    ],
  });
}
