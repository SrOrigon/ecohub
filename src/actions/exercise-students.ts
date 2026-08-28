"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertClassInScope } from "@/lib/tenant-guards";
import { studentsInClassWhere } from "@/lib/student-enrollments";
import { sortStudentsByName } from "@/lib/sort-order";

export type ClassStudentExerciseOption = {
  id: string;
  fullName: string;
  enrollmentCode: string;
  average: number | null;
  lowPerformance: boolean;
};

export async function getClassStudentsForExerciseAction(classId: string) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." as const };
  if (!classId) return { error: "Selecione uma turma." as const };

  const scope = await assertClassInScope(user, classId);
  if (!scope.ok) return { error: scope.error };

  const students = await prisma.student.findMany({
    where: {
      user: { schoolId: user.schoolId },
      ...studentsInClassWhere(classId),
      status: "active",
    },
    select: {
      id: true,
      enrollmentCode: true,
      user: { select: { fullName: true } },
      grades: { select: { value: true } },
    },
  });

  const rows = sortStudentsByName(students).map((student) => {
    const values = student.grades.map((grade) => grade.value).filter((value) => Number.isFinite(value));
    const average =
      values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    return {
      id: student.id,
      fullName: student.user.fullName,
      enrollmentCode: student.enrollmentCode,
      average,
      lowPerformance: average !== null && average < 6,
    } satisfies ClassStudentExerciseOption;
  });

  return { students: rows };
}
