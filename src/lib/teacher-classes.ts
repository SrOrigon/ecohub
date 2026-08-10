import type { Prisma } from "@prisma/client";

/** Filtros Prisma para turmas em que o professor é titular ou co-docente. */
export function teacherClassWhere(teacherId: string): Prisma.ClassGroupWhereInput {
  return {
    OR: [{ teacherId }, { coTeachers: { some: { teacherId } } }],
  };
}

export function studentInTeacherClassWhere(teacherId: string): Prisma.StudentWhereInput {
  return {
    OR: [
      { classGroup: { teacherId } },
      { classGroup: { coTeachers: { some: { teacherId } } } },
    ],
  };
}

export function classGroupForTeacherWhere(teacherId: string): Prisma.ClassGroupWhereInput {
  return teacherClassWhere(teacherId);
}
