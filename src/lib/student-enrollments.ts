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

  const [student, classGroup] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { user: { select: { schoolId: true } } },
    }),
    prisma.classGroup.findUnique({
      where: { id: classId },
      select: { schoolId: true },
    }),
  ]);

  if (!student?.user.schoolId || !classGroup?.schoolId) {
    throw new Error("Aluno ou turma não encontrados.");
  }
  if (student.user.schoolId !== classGroup.schoolId) {
    throw new Error("Aluno e turma devem pertencer à mesma escola.");
  }

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
    orderBy: [{ enrolledAt: "asc" }, { createdAt: "asc" }],
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

function classIdsFromStudentRecord(student: {
  classId: string | null;
  classEnrollments: Array<{ classId: string }>;
}) {
  const ids = new Set<string>();
  if (student.classId) ids.add(student.classId);
  for (const enrollment of student.classEnrollments) {
    ids.add(enrollment.classId);
  }
  return [...ids];
}

function intersectClassIds(classIdLists: string[][]) {
  if (classIdLists.length === 0) return [] as string[];
  let intersection = new Set(classIdLists[0]);
  for (let index = 1; index < classIdLists.length; index += 1) {
    const next = new Set(classIdLists[index]);
    intersection = new Set([...intersection].filter((classId) => next.has(classId)));
  }
  return [...intersection];
}

/** Garante Student.classId alinhado às matrículas ativas antes de vincular exercícios. */
export async function ensureStudentsHavePrimaryClass(studentIds: string[]) {
  for (const studentId of studentIds) {
    await syncPrimaryClassId(studentId);
  }
}

/**
 * Define a turma do exercício personalizado:
 * - usa turma preferida (filtro) se todos os alunos pertencem a ela;
 * - senão, turma em comum entre os selecionados;
 * - senão, turma principal do único aluno;
 * - alunos de turmas diferentes podem ficar com classId nulo (visibilidade via targets).
 */
export async function resolvePersonalizedExerciseClassId(
  schoolId: string,
  studentIds: string[],
  preferredClassId?: string | null
) {
  if (studentIds.length === 0) {
    return { classId: null as string | null, unassignedStudentIds: [] as string[] };
  }

  await ensureStudentsHavePrimaryClass(studentIds);

  const students = await prisma.student.findMany({
    where: { id: { in: studentIds }, user: { schoolId } },
    select: {
      id: true,
      classId: true,
      classEnrollments: {
        where: activeEnrollmentWhere(),
        select: { classId: true },
        orderBy: [{ enrolledAt: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  const unassignedStudentIds: string[] = [];
  const classIdLists: string[][] = [];

  for (const studentId of studentIds) {
    const student = students.find((row) => row.id === studentId);
    if (!student) {
      unassignedStudentIds.push(studentId);
      continue;
    }
    const classIds = classIdsFromStudentRecord(student);
    if (classIds.length === 0) unassignedStudentIds.push(studentId);
    else classIdLists.push(classIds);
  }

  if (unassignedStudentIds.length > 0) {
    return { classId: null, unassignedStudentIds };
  }

  const preferred = preferredClassId?.trim() || null;
  if (preferred && classIdLists.every((classIds) => classIds.includes(preferred))) {
    return { classId: preferred, unassignedStudentIds: [] };
  }

  const shared = intersectClassIds(classIdLists);
  if (shared.length > 0) {
    return { classId: preferred && shared.includes(preferred) ? preferred : shared[0], unassignedStudentIds: [] };
  }

  if (studentIds.length === 1) {
    return { classId: classIdLists[0][0], unassignedStudentIds: [] };
  }

  return { classId: null, unassignedStudentIds: [] };
}
