import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const ENROLLMENT_STATUSES = [
  { value: "active", label: "Vigente" },
  { value: "ended", label: "Encerrado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "locked", label: "Trancado" },
] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]["value"];

export const ACTIVE_ENROLLMENT_STATUSES: EnrollmentStatus[] = ["active", "locked"];

export function enrollmentStatusLabel(status: string) {
  return ENROLLMENT_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function activeEnrollmentWhere(classId?: string): Prisma.StudentClassEnrollmentWhereInput {
  return {
    status: { in: ACTIVE_ENROLLMENT_STATUSES },
    ...(classId ? { classId } : {}),
  };
}

/** Alunos matriculados em uma turma (fonte: vínculos + legado classId). */
export function studentsInClassWhere(classId: string): Prisma.StudentWhereInput {
  return {
    OR: [
      { classId },
      { classEnrollments: { some: activeEnrollmentWhere(classId) } },
    ],
  };
}

/** Filtro de ranking/listagem por turma. */
export function studentInClassFilter(classId: string): Prisma.StudentWhereInput {
  return studentsInClassWhere(classId);
}

type DbClient = Pick<typeof prisma, "student" | "studentClassEnrollment">;

export async function syncPrimaryClassId(studentId: string, client: DbClient = prisma) {
  const active = await client.studentClassEnrollment.findMany({
    where: { studentId, status: { in: ACTIVE_ENROLLMENT_STATUSES } },
    orderBy: [{ enrolledAt: "asc" }, { createdAt: "asc" }],
    select: { classId: true },
  });

  await client.student.update({
    where: { id: studentId },
    data: { classId: active[0]?.classId ?? null },
  });
}

export async function enrollStudentInClass(
  studentId: string,
  classId: string,
  options?: { notes?: string | null; status?: EnrollmentStatus }
) {
  const status = options?.status ?? "active";
  await prisma.studentClassEnrollment.upsert({
    where: { studentId_classId: { studentId, classId } },
    create: {
      studentId,
      classId,
      status,
      notes: options?.notes ?? null,
    },
    update: {
      status,
      endedAt: null,
      notes: options?.notes ?? undefined,
    },
  });
  await syncPrimaryClassId(studentId);
}

export async function setStudentEnrollmentStatus(
  studentId: string,
  classId: string,
  status: EnrollmentStatus
) {
  const endedAt = status === "active" || status === "locked" ? null : new Date();
  await prisma.studentClassEnrollment.update({
    where: { studentId_classId: { studentId, classId } },
    data: { status, endedAt },
  });
  await syncPrimaryClassId(studentId);
}

/** Remove o aluno da turma (cancela matrícula sem apagar histórico). */
export async function removeStudentFromClass(studentId: string, classId: string) {
  const enrollment = await prisma.studentClassEnrollment.findUnique({
    where: { studentId_classId: { studentId, classId } },
    select: { id: true },
  });

  if (enrollment) {
    await setStudentEnrollmentStatus(studentId, classId, "cancelled");
    return;
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true },
  });
  if (student?.classId === classId) {
    await prisma.student.update({
      where: { id: studentId },
      data: { classId: null },
    });
    await syncPrimaryClassId(studentId);
  }
}

export async function getStudentActiveEnrollments(studentId: string) {
  return prisma.studentClassEnrollment.findMany({
    where: { studentId, ...activeEnrollmentWhere() },
    include: {
      classGroup: { select: { id: true, name: true, gradeLevel: true, year: true } },
    },
    orderBy: [{ enrolledAt: "asc" }, { createdAt: "asc" }],
  });
}

export function formatStudentClasses(
  enrollments: Array<{ classGroup: { name: string }; status?: string }>,
  fallbackClass?: { name: string } | null
) {
  if (enrollments.length > 0) {
    return enrollments.map((item) => item.classGroup.name).join(" · ");
  }
  return fallbackClass?.name ?? "Sem turma";
}

export async function getStudentClassIds(studentId: string) {
  const enrollments = await prisma.studentClassEnrollment.findMany({
    where: { studentId, ...activeEnrollmentWhere() },
    select: { classId: true },
  });
  if (enrollments.length > 0) {
    return enrollments.map((item) => item.classId);
  }
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true },
  });
  return student?.classId ? [student.classId] : [];
}
