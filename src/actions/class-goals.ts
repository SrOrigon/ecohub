"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";
import { checkAndAwardClassGoals } from "@/lib/class-goals";
import { CLASS_GOAL_METRICS } from "@/lib/constants";
import { teacherClassWhere } from "@/lib/teacher-classes";
import { assertClassInScope } from "@/lib/tenant-guards";

function revalidateGoals() {
  revalidatePath("/dashboard/metas-coletivas");
  revalidatePath("/dashboard/gamificacao");
  revalidatePath("/dashboard/professor");
}

export async function createClassGoalAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.createClassGoals")) {
    return { error: "Sem permissão para criar metas coletivas." };
  }

  const classId = formData.get("classId")?.toString();
  const title = formData.get("title")?.toString().trim();
  const metric = formData.get("metric")?.toString() ?? "mission";
  const targetPercent = Number(formData.get("targetPercent") ?? settings.classGoals.defaultTargetPercent);
  const xpBonus = Number(formData.get("xpBonus") ?? settings.classGoals.defaultXpBonus);
  const coinBonus = Number(formData.get("coinBonus") ?? settings.classGoals.defaultCoinBonus);
  const deadlineStr = formData.get("deadline")?.toString();

  if (!classId || !title) return { error: "Turma e título são obrigatórios." };
  if (!CLASS_GOAL_METRICS.includes(metric as (typeof CLASS_GOAL_METRICS)[number])) {
    return { error: "Métrica inválida." };
  }

  const scope = await assertClassInScope(user, classId);
  if (!scope.ok) return { error: scope.error };

  await prisma.classGoal.create({
    data: {
      classId,
      title,
      metric,
      targetPercent: Math.min(100, Math.max(1, targetPercent)),
      xpBonus,
      coinBonus,
      deadline: deadlineStr ? new Date(deadlineStr) : null,
    },
  });

  revalidateGoals();
  return { success: true };
}

export async function checkClassGoalsAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  const classId = formData.get("classId")?.toString();
  if (!classId) return { error: "Turma inválida." };

  const scope = await assertClassInScope(user, classId);
  if (!scope.ok) return { error: scope.error };

  await checkAndAwardClassGoals(classId);
  revalidateGoals();
  return { success: true };
}

export async function deleteClassGoalAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const goalId = String(formData.get("goalId") ?? "");
  if (!goalId) return { error: "Meta inválida." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.createClassGoals")) {
    return { error: "Sem permissão para excluir metas coletivas." };
  }

  const goal = await prisma.classGoal.findFirst({
    where: { id: goalId, classGroup: { schoolId: user.schoolId } },
    select: { id: true, classId: true },
  });
  if (!goal) return { error: "Meta não encontrada." };

  const scope = await assertClassInScope(user, goal.classId);
  if (!scope.ok) return { error: scope.error };

  await prisma.classGoal.delete({ where: { id: goalId } });
  revalidateGoals();
  return { success: true };
}

export async function getClassGoalsForSchool(schoolId: string, teacherId?: string) {
  return prisma.classGoal.findMany({
    where: {
      classGroup: {
        schoolId,
        ...(teacherId ? teacherClassWhere(teacherId) : {}),
      },
    },
    include: {
      classGroup: { select: { name: true, _count: { select: { students: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}
