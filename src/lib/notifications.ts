import { prisma } from "@/lib/db";
import { getSchoolSettings, type SchoolSettings } from "@/lib/school-settings";

export type NotifyKind =
  | "grade"
  | "absence"
  | "mission"
  | "shop"
  | "exercise"
  | "exerciseGraded"
  | "submission"
  | "general";

function parentsAllowed(kind: NotifyKind, settings: SchoolSettings) {
  switch (kind) {
    case "grade":
      return settings.notifications.parentsOnGrade;
    case "absence":
      return settings.notifications.parentsOnAbsence;
    case "mission":
      return settings.notifications.parentsOnMission;
    case "shop":
      return settings.notifications.parentsOnShop;
    case "exercise":
      return settings.notifications.parentsOnExercise;
    case "exerciseGraded":
      return settings.notifications.parentsOnExerciseGraded;
    default:
      return true;
  }
}

function studentAllowed(kind: NotifyKind, settings: SchoolSettings) {
  if (kind === "absence") return settings.notifications.studentOnAbsence;
  return true;
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  href?: string
) {
  return prisma.notification.create({
    data: { userId, title, message, href: href ?? null },
  });
}

export async function notifyUser(userId: string, title: string, message: string, href?: string) {
  if (!userId) return;
  await createNotification(userId, title, message, href);
}

export async function notifyStudent(
  studentId: string,
  title: string,
  message: string,
  href?: string,
  kind: NotifyKind = "general"
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { userId: true, user: { select: { schoolId: true } } },
  });
  if (!student) return;

  if (student.user.schoolId) {
    const settings = await getSchoolSettings(student.user.schoolId);
    if (!studentAllowed(kind, settings)) return;
  }

  await createNotification(student.userId, title, message, href);
}

export async function notifyStudentParents(
  studentId: string,
  title: string,
  message: string,
  href?: string,
  kind: NotifyKind = "general"
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { user: { select: { schoolId: true } } },
  });
  if (!student) return;

  const settings = await getSchoolSettings(student.user.schoolId);
  if (!parentsAllowed(kind, settings)) return;

  const links = await prisma.parentStudent.findMany({
    where: { studentId },
    select: { parentId: true },
  });
  for (const link of links) {
    await createNotification(link.parentId, title, message, href);
  }
}

export async function notifyClassTeacher(
  classId: string | null | undefined,
  title: string,
  message: string,
  href?: string
) {
  if (!classId) return;
  const turma = await prisma.classGroup.findUnique({
    where: { id: classId },
    select: { teacherId: true },
  });
  if (turma?.teacherId) {
    await createNotification(turma.teacherId, title, message, href);
  }
}

export async function canNotifyTeacherSubmission(schoolId: string | null | undefined) {
  const settings = await getSchoolSettings(schoolId);
  return settings.notifications.teacherOnSubmission;
}
