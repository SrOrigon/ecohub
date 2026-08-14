import { prisma } from "@/lib/db";
import { awardXp } from "@/lib/gamification";
import { getSchoolSettings } from "@/lib/school-settings";
import { notifyStudent, notifyUser } from "@/lib/notifications";
import type { ClassGoalMetric } from "@/lib/constants";

export async function getClassGoalProgress(classId: string, metric: ClassGoalMetric) {
  const students = await prisma.student.findMany({
    where: { classId },
    include: {
      studentMissions: { include: { mission: true } },
      exerciseSubmissions: true,
      attendance: true,
    },
  });

  if (students.length === 0) return { percent: 0, completed: 0, total: 0 };

  // A meta de exercícios considera apenas os exercícios ativos da própria turma.
  const activeExerciseIds =
    metric === "exercise"
      ? (
          await prisma.exercise.findMany({
            where: { classId, isActive: true },
            select: { id: true },
          })
        ).map((e) => e.id)
      : [];

  let completed = 0;

  for (const s of students) {
    let done = false;
    if (metric === "mission") {
      const active = s.studentMissions.filter((sm) => sm.mission.isActive);
      done = active.length > 0 && active.every((m) => m.completedAt);
    } else if (metric === "exercise") {
      done =
        activeExerciseIds.length > 0 &&
        activeExerciseIds.every((exerciseId) =>
          s.exerciseSubmissions.some(
            (sub) =>
              sub.exerciseId === exerciseId &&
              (sub.status === "graded" || sub.status === "submitted")
          )
        );
    } else if (metric === "attendance") {
      const recent = s.attendance.slice(-5);
      done =
        recent.length > 0 &&
        recent.filter((a) => a.status === "present" || a.status === "late").length / recent.length >= 0.8;
    }
    if (done) completed++;
  }

  const percent = Math.round((completed / students.length) * 100);
  return { percent, completed, total: students.length };
}

export async function checkAndAwardClassGoals(classId: string) {
  const goals = await prisma.classGoal.findMany({
    where: { classId, isActive: true, awardedAt: null },
    include: { classGroup: { select: { schoolId: true, name: true, teacherId: true } } },
  });

  for (const goal of goals) {
    if (goal.deadline && goal.deadline < new Date()) continue;

    const progress = await getClassGoalProgress(classId, goal.metric as ClassGoalMetric);
    if (progress.percent < goal.targetPercent) continue;

    const settings = await getSchoolSettings(goal.classGroup.schoolId);
    if (!settings.classGoals.autoAward) continue;

    // Marca a meta antes de premiar: evita bônus duplicado em chamadas concorrentes.
    const claimed = await prisma.classGoal.updateMany({
      where: { id: goal.id, awardedAt: null },
      data: { awardedAt: new Date() },
    });
    if (claimed.count === 0) continue;

    const students = await prisma.student.findMany({ where: { classId } });

    for (const student of students) {
      await awardXp(
        student.id,
        goal.xpBonus,
        `Meta coletiva: ${goal.title}`,
        "classGoal",
        goal.coinBonus,
        settings
      );
      await notifyStudent(
        student.id,
        "Meta da turma alcançada!",
        `Sua turma bateu ${goal.targetPercent}% em "${goal.title}". +${goal.xpBonus} XP!`,
        "/dashboard/gamificacao",
        "mission"
      );
    }

    if (goal.classGroup.teacherId) {
      await notifyUser(
        goal.classGroup.teacherId,
        "Meta coletiva concluída",
        `A turma ${goal.classGroup.name} atingiu a meta "${goal.title}" (${progress.percent}%).`,
        "/dashboard/metas-coletivas"
      );
    }
  }
}
