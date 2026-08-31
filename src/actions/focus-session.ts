"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { awardXp } from "@/lib/gamification";
import { revalidatePath } from "next/cache";

const FOCUS_COOLDOWN_MS = 25 * 60 * 1000;
const BASE_XP_REWARD = 50;
const HYPER_FOCUS_BONUS = 15;

/** Sessão Pomodoro concluída — recompensa com cooldown anti-abuso */
export async function completeFocusSessionAction() {
  const user = await requireSession(["student"]);
  const student = await prisma.student.findFirst({ where: { userId: user.id } });
  if (!student) return { error: "Aluno não encontrado." };

  const recent = await prisma.studentActivity.findFirst({
    where: {
      studentId: student.id,
      type: "focus_session",
      createdAt: { gte: new Date(Date.now() - FOCUS_COOLDOWN_MS) },
    },
    select: { id: true },
  });
  if (recent) {
    return { error: "Aguarde 25 minutos entre sessões de foco para receber XP novamente." };
  }

  const hasHyperFocus = await prisma.studentActivity.findFirst({
    where: {
      studentId: student.id,
      type: "talent_unlocked",
      detail: "talent:hyper_focus",
    },
    select: { id: true },
  });

  const xpReward = BASE_XP_REWARD + (hasHyperFocus ? HYPER_FOCUS_BONUS : 0);

  await awardXp(
    student.id,
    xpReward,
    "Sessão de Foco Pomodoro concluída com sucesso! ⏱️",
    "focus_session"
  );

  await prisma.studentActivity.create({
    data: {
      studentId: student.id,
      type: "focus_session",
      title: "⏱️ Sessão de Foco Concluída!",
      detail: `Completou 25 minutos de estudo concentrado (+${xpReward} XP).`,
    },
  });

  revalidatePath("/dashboard/aluno");
  return { success: true, xpEarned: xpReward };
}
