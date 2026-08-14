"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";
import { TRAIL_STEP_TYPES } from "@/lib/constants";

function revalidateTrails() {
  revalidatePath("/dashboard/trilhas");
  revalidatePath("/dashboard/aluno");
  revalidatePath("/dashboard/gamificacao");
}

export async function createTrailAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (!settings.trails.enabled) return { error: "Trilhas desativadas nas configurações." };
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.createTrails")) {
    return { error: "Sem permissão para criar trilhas." };
  }

  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;
  const classId = formData.get("classId")?.toString() || null;
  const xpBonus = Number(formData.get("xpBonus") ?? 100);
  const coinBonus = Number(formData.get("coinBonus") ?? 30);
  const stepsJson = formData.get("stepsJson")?.toString();

  if (!title || !stepsJson) return { error: "Título e etapas são obrigatórios." };

  let steps: { stepType: string; missionId?: string; exerciseId?: string; rewardId?: string; title?: string }[];
  try {
    steps = JSON.parse(stepsJson);
  } catch {
    return { error: "Etapas inválidas." };
  }

  if (!Array.isArray(steps) || steps.length === 0) return { error: "Adicione ao menos uma etapa." };

  for (const s of steps) {
    if (!TRAIL_STEP_TYPES.includes(s.stepType as (typeof TRAIL_STEP_TYPES)[number])) {
      return { error: "Tipo de etapa inválido." };
    }
  }

  await prisma.learningTrail.create({
    data: {
      schoolId: user.schoolId,
      classId: classId || null,
      title,
      description,
      xpBonus,
      coinBonus,
      steps: {
        create: steps.map((s, i) => ({
          sortOrder: i,
          stepType: s.stepType,
          missionId: s.missionId || null,
          exerciseId: s.exerciseId || null,
          rewardId: s.rewardId || null,
          title: s.title || null,
        })),
      },
    },
  });

  revalidateTrails();
  return { success: true };
}

export async function toggleTrailAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const id = formData.get("id")?.toString();
  const isActive = formData.get("isActive") === "true";

  if (!id) return { error: "Trilha inválida." };

  await prisma.learningTrail.updateMany({
    where: { id, schoolId: user.schoolId },
    data: { isActive },
  });

  revalidateTrails();
  return { success: true };
}

export async function deleteTrailAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Trilha inválida." };

  const trail = await prisma.learningTrail.findFirst({
    where: { id, schoolId: user.schoolId },
  });
  if (!trail) return { error: "Trilha não encontrada." };

  await prisma.learningTrail.delete({ where: { id } });
  revalidateTrails();
  return { success: true };
}
