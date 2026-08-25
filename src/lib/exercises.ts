import { prisma } from "@/lib/db";
import { teacherClassWhere } from "@/lib/teacher-classes";
import type { SessionUser } from "@/lib/auth";

export type ExerciseKind = "homework" | "exam";
export type QuestionType = "choice" | "text" | "true_false" | "flashcard";

export interface ChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  choice: "Múltipla escolha",
  text: "Resposta aberta",
  true_false: "Verdadeiro ou falso",
  flashcard: "Flashcard",
};

export function parseOptions(json: string | null): ChoiceOption[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as ChoiceOption[];
  } catch {
    return [];
  }
}

export function isSelectableQuestionType(type: string): boolean {
  return type === "choice" || type === "true_false" || type === "flashcard";
}

export function isAutoGradableQuestionType(type: string): boolean {
  return isSelectableQuestionType(type);
}

export function questionTypeNeedsOptions(type: string): boolean {
  return type !== "text";
}

export function trueFalseOptions(correct: "true" | "false" = "true"): ChoiceOption[] {
  return [
    { id: "true", text: "Verdadeiro", isCorrect: correct === "true" },
    { id: "false", text: "Falso", isCorrect: correct === "false" },
  ];
}

export function flashcardBackOption(back = ""): ChoiceOption[] {
  return [{ id: "back", text: back, isCorrect: true }];
}

export function parseFlashcardBack(options: string | null): string {
  const opts = parseOptions(options);
  return opts.find((o) => o.id === "back")?.text ?? opts[0]?.text ?? "";
}

export const FLASHCARD_SELF_OPTIONS: ChoiceOption[] = [
  { id: "knew", text: "Eu sabia!", isCorrect: true },
  { id: "review", text: "Vou revisar", isCorrect: false },
];

export async function getTeacherClasses(user: SessionUser) {
  if (!user.schoolId) return [];
  if (user.role === "admin" || user.role === "director") {
    return prisma.classGroup.findMany({
      where: { schoolId: user.schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }
  return prisma.classGroup.findMany({
    where: { schoolId: user.schoolId, ...teacherClassWhere(user.id) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getExercisesForUser(user: SessionUser) {
  if (!user.schoolId) return [];

  if (user.role === "student") {
    const student = await prisma.student.findUnique({ where: { userId: user.id } });
    if (!student?.classId) return [];
    return prisma.exercise.findMany({
      where: {
        schoolId: user.schoolId,
        isActive: true,
        classId: student.classId,
      },
      include: {
        classGroup: { select: { name: true } },
        teacher: { select: { fullName: true } },
        questions: { orderBy: { sortOrder: "asc" } },
        submissions: { where: { studentId: student.id } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  if (user.role === "parent") {
    return [];
  }

  const classFilter =
    user.role === "teacher"
      ? {
          OR: [
            { teacherId: user.id },
            { classGroup: teacherClassWhere(user.id) },
          ],
        }
      : {};

  return prisma.exercise.findMany({
    where: { schoolId: user.schoolId, ...classFilter },
    include: {
      classGroup: { select: { name: true } },
      teacher: { select: { fullName: true } },
      questions: true,
      submissions: {
        include: {
          student: { include: { user: { select: { fullName: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Listagem leve para o painel do professor (sem joins pesados). */
export async function getExerciseSummariesForTeacher(user: SessionUser) {
  if (!user.schoolId || user.role !== "teacher") return [];

  return prisma.exercise.findMany({
    where: {
      schoolId: user.schoolId,
      OR: [{ teacherId: user.id }, { classGroup: teacherClassWhere(user.id) }],
    },
    select: {
      id: true,
      title: true,
      kind: true,
      maxPoints: true,
      xpReward: true,
      coinReward: true,
      dueDate: true,
      isActive: true,
      classGroup: { select: { name: true } },
      teacher: { select: { fullName: true } },
      _count: { select: { questions: true } },
      submissions: {
        where: { status: "submitted" },
        select: { status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getExercisesForStudentId(studentId: string, schoolId: string | null) {
  if (!schoolId) return [];
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student?.classId) return [];

  return prisma.exercise.findMany({
    where: {
      schoolId,
      isActive: true,
      classId: student.classId,
    },
    include: {
      classGroup: { select: { name: true } },
      teacher: { select: { fullName: true } },
      questions: { select: { id: true } },
      submissions: { where: { studentId: student.id } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getExerciseById(id: string, user: SessionUser) {
  if (!user.schoolId) return null;

  const exercise = await prisma.exercise.findFirst({
    where: { id, schoolId: user.schoolId },
    include: {
      classGroup: { select: { name: true, id: true } },
      teacher: { select: { fullName: true, id: true } },
      questions: { orderBy: { sortOrder: "asc" } },
      submissions: {
        include: {
          student: { include: { user: { select: { fullName: true, email: true } } } },
          answers: true,
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });
  if (!exercise) return null;

  if (user.role === "student") {
    const student = await prisma.student.findUnique({ where: { userId: user.id } });
    if (!student || exercise.classId !== student.classId) return null;
  } else if (user.role === "teacher") {
    if (exercise.teacherId !== user.id) {
      // Co-docentes também devem enxergar o exercício da turma que lecionam.
      const teaches = exercise.classId
        ? await prisma.classGroup.findFirst({
            where: {
              id: exercise.classId,
              schoolId: user.schoolId,
              ...teacherClassWhere(user.id),
            },
          })
        : null;
      if (!teaches) return null;
    }
  } else if (user.role === "parent") {
    if (!exercise.classId) return null;
    const link = await prisma.parentStudent.findFirst({
      where: {
        parentId: user.id,
        student: { classId: exercise.classId },
      },
    });
    if (!link) return null;
  }

  return exercise;
}

export const EXERCISE_KIND_LABELS: Record<ExerciseKind, string> = {
  homework: "Exercício de casa",
  exam: "Prova",
};
