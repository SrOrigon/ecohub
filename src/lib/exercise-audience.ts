import type { Prisma } from "@prisma/client";
import { studentsInClassWhere } from "@/lib/student-enrollments";

export type ExerciseAudienceType = "class" | "personalized";

export const EXERCISE_AUDIENCE_LABELS: Record<ExerciseAudienceType, string> = {
  class: "Toda a turma",
  personalized: "Alunos selecionados (personalizado)",
};

export const PERSONALIZATION_TAGS = [
  { value: "", label: "Sem etiqueta" },
  { value: "adaptado", label: "Adaptado / NEE" },
  { value: "reforco", label: "Reforço escolar" },
  { value: "baixo_desempenho", label: "Baixo desempenho" },
  { value: "neurodivergente", label: "Neurodivergente" },
  { value: "enriquecimento", label: "Enriquecimento" },
] as const;

export function personalizationTagLabel(value: string | null | undefined) {
  return PERSONALIZATION_TAGS.find((item) => item.value === value)?.label ?? null;
}

export function exerciseVisibleToStudentWhere(studentId: string, classIds: string[]): Prisma.ExerciseWhereInput {
  const uniqueClassIds = [...new Set(classIds.filter(Boolean))];
  return {
    OR: [
      ...(uniqueClassIds.length > 0
        ? [{ audienceType: "class", classId: { in: uniqueClassIds } }]
        : []),
      { audienceType: "personalized", studentTargets: { some: { studentId } } },
    ],
  };
}

export function studentClassIds(student: {
  classId: string | null;
  classEnrollments?: Array<{ classId: string; status: string }>;
}) {
  const ids = new Set<string>();
  if (student.classId) ids.add(student.classId);
  for (const enrollment of student.classEnrollments ?? []) {
    if (enrollment.status === "active" || enrollment.status === "locked") {
      ids.add(enrollment.classId);
    }
  }
  return [...ids];
}

export async function studentHasExerciseAccess(
  exercise: {
    audienceType: string;
    classId: string | null;
    studentTargets?: Array<{ studentId: string }>;
  },
  student: {
    id: string;
    classId: string | null;
    classEnrollments?: Array<{ classId: string; status: string }>;
  }
) {
  if (exercise.audienceType === "personalized") {
    return (exercise.studentTargets ?? []).some((target) => target.studentId === student.id);
  }
  if (!exercise.classId) return false;
  const classIds = studentClassIds(student);
  return classIds.includes(exercise.classId);
}

export function classStudentCountWhere(classId: string) {
  return studentsInClassWhere(classId);
}
