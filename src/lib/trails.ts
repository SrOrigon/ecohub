import { prisma } from "@/lib/db";
import { awardXp } from "@/lib/gamification";
import { completeMission } from "@/lib/gamification";
import { getSchoolSettings } from "@/lib/school-settings";
import { notifyStudent } from "@/lib/notifications";
import type { TrailStepType } from "@/lib/constants";

export async function getTrailsForStudent(studentId: string, classId: string | null, schoolId: string | null) {
  return prisma.learningTrail.findMany({
    where: {
      schoolId: schoolId ?? undefined,
      isActive: true,
      OR: [{ classId: null }, { classId: classId ?? undefined }],
    },
    include: {
      steps: {
        orderBy: { sortOrder: "asc" },
        include: { mission: true, exercise: true, reward: true },
      },
      progress: { where: { studentId } },
      classGroup: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function isStepComplete(studentId: string, stepType: string, missionId?: string | null, exerciseId?: string | null) {
  if (stepType === "mission" && missionId) {
    const sm = await prisma.studentMission.findUnique({
      where: { studentId_missionId: { studentId, missionId } },
    });
    return !!sm?.completedAt;
  }
  if (stepType === "exercise" && exerciseId) {
    const sub = await prisma.exerciseSubmission.findUnique({
      where: { exerciseId_studentId: { exerciseId, studentId } },
    });
    return sub?.status === "graded" || sub?.status === "submitted";
  }
  if (stepType === "reward") {
    return true;
  }
  return false;
}

export async function advanceTrailProgress(studentId: string, trailId: string) {
  const trail = await prisma.learningTrail.findUnique({
    where: { id: trailId },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  if (!trail) return;

  let progress = await prisma.studentTrailProgress.findUnique({
    where: { studentId_trailId: { studentId, trailId } },
  });

  if (!progress) {
    progress = await prisma.studentTrailProgress.create({
      data: { studentId, trailId, currentStep: 0 },
    });
  }

  if (progress.completedAt) return;

  const currentStep = trail.steps[progress.currentStep];
  if (!currentStep) return;

  const done = await isStepComplete(
    studentId,
    currentStep.stepType,
    currentStep.missionId,
    currentStep.exerciseId
  );
  if (!done) return;

  const nextStep = progress.currentStep + 1;
  const isComplete = nextStep >= trail.steps.length;

  await prisma.studentTrailProgress.update({
    where: { id: progress.id },
    data: {
      currentStep: isComplete ? progress.currentStep : nextStep,
      completedAt: isComplete ? new Date() : null,
    },
  });

  if (isComplete) {
    const settings = await getSchoolSettings(trail.schoolId);
    const xpBonus = trail.xpBonus + settings.trails.completionXpBonus;
    await awardXp(studentId, xpBonus, `Trilha concluída: ${trail.title}`, "trail", trail.coinBonus, settings);
    await notifyStudent(
      studentId,
      "Trilha concluída!",
      `Você completou "${trail.title}" e ganhou +${xpBonus} XP!`,
      "/dashboard/trilhas",
      "mission"
    );
  }
}

export async function syncTrailAfterAction(
  studentId: string,
  stepType: TrailStepType,
  entityId: string
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true, user: { select: { schoolId: true } } },
  });
  if (!student) return;

  const trails = await prisma.learningTrail.findMany({
    where: {
      schoolId: student.user.schoolId ?? undefined,
      isActive: true,
      steps: {
        some:
          stepType === "mission"
            ? { missionId: entityId }
            : stepType === "exercise"
              ? { exerciseId: entityId }
              : { rewardId: entityId },
      },
    },
    select: { id: true },
  });

  for (const t of trails) {
    await advanceTrailProgress(studentId, t.id);
  }
}

export async function startTrailMission(studentId: string, missionId: string) {
  try {
    await completeMission(studentId, missionId);
    await syncTrailAfterAction(studentId, "mission", missionId);
  } catch {
    // mission may already be complete  -  still sync trail
    await syncTrailAfterAction(studentId, "mission", missionId);
  }
}
