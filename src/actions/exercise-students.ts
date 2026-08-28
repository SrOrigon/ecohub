"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { assertClassInScope } from "@/lib/tenant-guards";
import { studentsInClassWhere } from "@/lib/student-enrollments";
import { studentInTeacherClassWhere } from "@/lib/teacher-classes";
import { sortStudentsByName } from "@/lib/sort-order";

export type ClassStudentExerciseOption = {
  id: string;
  fullName: string;
  enrollmentCode: string;
  classLabel: string | null;
  average: number | null;
  lowPerformance: boolean;
};

function studentClassLabel(student: {
  classGroup: { name: string } | null;
  classEnrollments: Array<{ classGroup: { name: string } }>;
}) {
  return student.classGroup?.name ?? student.classEnrollments[0]?.classGroup.name ?? null;
}

function mapStudentRows(
  students: Array<{
    id: string;
    enrollmentCode: string;
    user: { fullName: string };
    grades: Array<{ value: number }>;
    classGroup: { name: string } | null;
    classEnrollments: Array<{ classGroup: { name: string } }>;
  }>
) {
  return sortStudentsByName(students).map((student) => {
    const values = student.grades.map((grade) => grade.value).filter((value) => Number.isFinite(value));
    const average =
      values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    return {
      id: student.id,
      fullName: student.user.fullName,
      enrollmentCode: student.enrollmentCode,
      classLabel: studentClassLabel(student),
      average,
      lowPerformance: average !== null && average < 6,
    } satisfies ClassStudentExerciseOption;
  });
}

async function fetchStudents(where: Prisma.StudentWhereInput) {
  const students = await prisma.student.findMany({
    where,
    select: {
      id: true,
      enrollmentCode: true,
      user: { select: { fullName: true } },
      grades: { select: { value: true } },
      classGroup: { select: { name: true } },
      classEnrollments: {
        where: { status: { in: ["active", "locked"] } },
        select: { classGroup: { select: { name: true } } },
        orderBy: { enrolledAt: "asc" },
        take: 1,
      },
    },
  });
  return mapStudentRows(students);
}

export async function getStudentsForExerciseAction(classId?: string) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." as const };

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
}

/** @deprecated Use getStudentsForExerciseAction */
export async function getClassStudentsForExerciseAction(classId: string) {
  return getStudentsForExerciseAction(classId);
}
