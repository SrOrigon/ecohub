"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSchoolSettings, mergeSchoolSettings, stringifySchoolSettings } from "@/lib/school-settings";

const STANDARD_SUBJECTS = [
  "Matemática",
  "Língua Portuguesa",
  "História",
  "Geografia",
  "Ciências",
  "Física",
  "Química",
  "Biologia",
  "Educação Física",
  "Artes",
  "Língua Inglesa",
  "Filosofia",
  "Sociologia",
];

const STARTER_BADGES = [
  {
    name: "Nota 10",
    description: "Conquistado ao obter nota máxima em uma avaliação.",
    icon: "award",
    xpRequired: 100,
  },
  {
    name: "Assiduidade de Ouro",
    description: "Sem nenhuma falta no bimestre.",
    icon: "check-circle",
    xpRequired: 150,
  },
  {
    name: "Mestre das Missões",
    description: "Concluiu missões pedagógicas com sucesso.",
    icon: "zap",
    xpRequired: 200,
  },
  {
    name: "Estudante Exemplar",
    description: "Destaque da turma no trimestre.",
    icon: "star",
    xpRequired: 300,
  },
];

const STARTER_REWARDS = [
  {
    name: "Vale 0.5 Ponto Extra",
    description: "Adiciona meio ponto na menor nota da disciplina à escolha.",
    coinCost: 500,
    stock: 20,
  },
  {
    name: "Passe Livre de Tarefa",
    description: "Isenção de uma tarefa de casa simples.",
    coinCost: 350,
    stock: 15,
  },
  {
    name: "Escolher Lugar na Sala",
    description: "Direito a escolher o assento na sala de aula por 1 semana.",
    coinCost: 250,
    stock: 10,
  },
  {
    name: "Adesivo EduHub Exclusivo",
    description: "Adesivo físico da comunidade EduHub.",
    coinCost: 150,
    stock: 50,
  },
];

export async function provisionRealSchoolSetupAction() {
  const user = await requireSession();
  if (user.role !== "admin" && user.role !== "director" && user.role !== "secretary") {
    return { error: "Permissão negada. Apenas direção e secretaria podem inicializar a instituição." };
  }

  const schoolId = user.schoolId;
  if (!schoolId) {
    return { error: "Usuário não vinculado a uma instituição." };
  }

  try {
    const currentSettings = await getSchoolSettings(schoolId);
    const existingSubjects = currentSettings.academic?.subjects ?? [];
    const mergedSubjects = Array.from(new Set([...existingSubjects, ...STANDARD_SUBJECTS]));

    const updatedSettings = mergeSchoolSettings(currentSettings, {
      academic: {
        ...currentSettings.academic,
        subjects: mergedSubjects,
        periods: ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"],
        passGrade: currentSettings.academic?.passGrade ?? 7.0,
        maxGrade: currentSettings.academic?.maxGrade ?? 10.0,
      },
      exercises: {
        ...currentSettings.exercises,
        presets: [
          { label: "Atividade Leve", xp: 40, coins: 10, points: 5 },
          { label: "Exercício Prático", xp: 80, coins: 20, points: 10 },
          { label: "Avaliação Bimestral", xp: 150, coins: 40, points: 10 },
          { label: "Desafio Especial", xp: 200, coins: 50, points: 15 },
        ],
      },
      classGoals: {
        ...currentSettings.classGoals,
        autoAward: true,
        defaultTargetPercent: 80,
      },
    });

    await prisma.school.update({
      where: { id: schoolId },
      data: { settings: stringifySchoolSettings(updatedSettings) },
    });

    for (const badge of STARTER_BADGES) {
      const exists = await prisma.badge.findFirst({
        where: { schoolId, name: badge.name },
      });
      if (!exists) {
        await prisma.badge.create({
          data: {
            schoolId,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            xpRequired: badge.xpRequired,
          },
        });
      }
    }

    for (const reward of STARTER_REWARDS) {
      const exists = await prisma.reward.findFirst({
        where: { schoolId, name: reward.name },
      });
      if (!exists) {
        await prisma.reward.create({
          data: {
            schoolId,
            name: reward.name,
            description: reward.description,
            coinCost: reward.coinCost,
            stock: reward.stock,
            isActive: true,
          },
        });
      }
    }

    revalidatePath("/dashboard/configuracoes");
    revalidatePath("/dashboard/disciplinas");
    revalidatePath("/dashboard/loja");
    revalidatePath("/dashboard/gamificacao");
    revalidatePath("/dashboard/leitura-geral");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Instituição inicializada com sucesso! Disciplinas, regras acadêmicas, badges e prêmios da loja foram configurados.",
      subjectCount: mergedSubjects.length,
    };
  } catch (err) {
    console.error("[provisionRealSchoolSetupAction] Error:", err);
    return { error: "Falha ao inicializar dados da instituição. Tente novamente." };
  }
}
