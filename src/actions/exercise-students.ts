"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { assertClassInScope } from "@/lib/tenant-guards";
import {
  activeEnrollmentWhere,
  ensureStudentsHavePrimaryClass,
  formatStudentClasses,
  studentsInClassWhere,
} from "@/lib/student-enrollments";
import { studentInTeacherClassWhere } from "@/lib/teacher-classes";
import { sortStudentsByName } from "@/lib/sort-order";

export type ClassStudentExerciseOption = {
  id: string;
  fullName: string;
  enrollmentCode: string;
  classLabel: string | null;
  primaryClassId: string | null;
  hasClass: boolean;
  average: number | null;
  lowPerformance: boolean;
};

async function fetchStudents(where: Prisma.StudentWhereInput) {
  const students = await prisma.student.findMany({
    where,
    select: {
      id: true,
      classId: true,
      enrollmentCode: true,
      user: { select: { fullName: true } },
      grades: { select: { value: true } },
      classGroup: { select: { name: true } },
      classEnrollments: {
        where: activeEnrollmentWhere(),
        select: { classId: true, classGroup: { select: { name: true } } },
        orderBy: [{ enrolledAt: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  await ensureStudentsHavePrimaryClass(students.map((student) => student.id));

  const syncedClassIds = new Map(
    (
      await prisma.student.findMany({
        where: { id: { in: students.map((student) => student.id) } },
        select: { id: true, classId: true },
      })
    ).map((student) => [student.id, student.classId] as const)
  );

  const refreshed = students.map((student) => {
    const primaryClassId =
      syncedClassIds.get(student.id) ?? student.classEnrollments[0]?.classId ?? null;
    const hasClass = Boolean(primaryClassId);
    const classLabel = hasClass ? formatStudentClasses(student.classEnrollments, student.classGroup) : null;
    const values = student.grades.map((grade) => grade.value).filter((value) => Number.isFinite(value));
    const average =
      values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

    return {
      id: student.id,
      fullName: student.user.fullName,
      enrollmentCode: student.enrollmentCode,
      classLabel,
      primaryClassId,
      hasClass,
      average,
      lowPerformance: average !== null && average < 6,
    } satisfies ClassStudentExerciseOption;
  });

  return sortStudentsByName(
    refreshed.map((row) => ({ ...row, user: { fullName: row.fullName } }))
  ).map((row) => {
    const { user: _unused, ...rest } = row;
    void _unused;
    return rest;
  });
}

export async function getStudentsForExerciseAction(classId?: string) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." as const };

  try {
    if (classId) {
      const scope = await assertClassInScope(user, classId);
      if (!scope.ok) return { error: scope.error };

      const students = await fetchStudents({
        user: { schoolId: user.schoolId },
        status: "active",
        ...studentsInClassWhere(classId),
      });
      return { students };
    }

    const students = await fetchStudents({
      user: { schoolId: user.schoolId },
      status: "active",
      ...(user.role === "teacher" ? studentInTeacherClassWhere(user.id) : {}),
    });

    return { students };
  } catch (error) {
    console.error("[getStudentsForExerciseAction]", error);
    return {
      error:
        error instanceof Error
          ? error.message.includes("audienceType") || error.message.includes("ExerciseStudentTarget")
            ? "Banco de dados desatualizado. Aguarde o deploy concluir ou contate o suporte."
            : error.message
          : "Erro ao carregar alunos.",
    };
  }
}

/** @deprecated Use getStudentsForExerciseAction */
export async function getClassStudentsForExerciseAction(classId: string) {
  return getStudentsForExerciseAction(classId);
}
