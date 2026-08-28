import type { Prisma } from "@prisma/client";

/** Filtros Prisma para turmas em que o professor é titular ou co-docente. */
export function teacherClassWhere(teacherId: string): Prisma.ClassGroupWhereInput {
  return {
    OR: [{ teacherId }, { coTeachers: { some: { teacherId } } }],
  };
}

export function studentInTeacherClassWhere(teacherId: string): Prisma.StudentWhereInput {
  const classTeacherFilter = {
    OR: [{ teacherId }, { coTeachers: { some: { teacherId } } }],
  };
  return {
    OR: [
      { classGroup: classTeacherFilter },
      {
        classEnrollments: {
          some: {
            status: { in: ["active", "locked"] },
            classGroup: classTeacherFilter,
          },
        },
      },
    ],
  };
}

export function classGroupForTeacherWhere(teacherId: string): Prisma.ClassGroupWhereInput {
  return teacherClassWhere(teacherId);
}
