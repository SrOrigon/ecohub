"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  TALENT_DETAIL_PREFIX,
  TALENTS_CATALOG,
  spentTalentPoints,
} from "@/lib/talents-catalog";
import { revalidatePath } from "next/cache";

export async function getStudentUnlockedTalentKeys(studentId: string) {
  const rows = await prisma.studentActivity.findMany({
    where: { studentId, type: "talent_unlocked" },
    select: { detail: true },
  });

  return rows
    .map((row) =>
      row.detail?.startsWith(TALENT_DETAIL_PREFIX)
        ? row.detail.slice(TALENT_DETAIL_PREFIX.length)
        : null
    )
    .filter((key): key is string => Boolean(key));
}

/** Desbloqueia uma habilidade da árvore de talentos */
export async function unlockTalentAction(formData: FormData) {
  const user = await requireSession(["student"]);
  const talentKey = String(formData.get("talentKey") ?? "").trim();

  const student = await prisma.student.findFirst({
    where: { userId: user.id },
  });
  if (!student) return { error: "Aluno não encontrado." };

  const talent = TALENTS_CATALOG.find((t) => t.key === talentKey);
  if (!talent) return { error: "Talento não encontrado." };

  if (student.level < talent.minLevel) {
    return { error: `Você precisa atingir o nível ${talent.minLevel} para desbloquear este talento.` };
  }

  const unlockedKeys = await getStudentUnlockedTalentKeys(student.id);
  if (unlockedKeys.includes(talent.key)) {
    return { error: "Este talento já foi desbloqueado." };
  }

  if (talent.prerequisiteKey && !unlockedKeys.includes(talent.prerequisiteKey)) {
    const prereq = TALENTS_CATALOG.find((item) => item.key === talent.prerequisiteKey);
    return {
      error: `Desbloqueie "${prereq?.name ?? talent.prerequisiteKey}" antes deste talento.`,
    };
  }

  const availablePoints = Math.max(0, student.level - spentTalentPoints(unlockedKeys));
  if (availablePoints < talent.costPoints) {
    return { error: "Pontos de talento insuficientes." };
  }

  await prisma.studentActivity.create({
    data: {
      studentId: student.id,
      type: "talent_unlocked",
      title: `🌟 Talento Desbloqueado: "${talent.name}"`,
      detail: `${TALENT_DETAIL_PREFIX}${talent.key}`,
    },
  });

  revalidatePath("/dashboard/aluno");
  revalidatePath("/dashboard/perfil");
  return { success: true, talentKey };
}
