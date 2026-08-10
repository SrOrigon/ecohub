import type { Prisma } from "@prisma/client";
import { EXERCISE_KIND_LABELS, type ExerciseKind } from "@/lib/exercises";

type Tx = Prisma.TransactionClient;

export function exerciseBulletinMeta(
  exercise: {
    kind: string;
    title: string;
    dueDate: Date | null;
    classGroup?: { name: string } | null;
  },
  schoolPeriods: string[]
) {
  const kind = exercise.kind as ExerciseKind;
  const subject =
    kind === "exam"
      ? "Prova"
      : EXERCISE_KIND_LABELS[kind]?.replace(" de casa", "") ?? "Atividades";

  const refDate = exercise.dueDate ?? new Date();
  const month = refDate.getMonth();
  const bimestreIndex = Math.min(Math.floor(month / 3), Math.max(schoolPeriods.length - 1, 0));
  const basePeriod = schoolPeriods[bimestreIndex] ?? schoolPeriods[0] ?? "Atividades";

  const period = `${basePeriod} · ${exercise.title.slice(0, 32)}`;

  return { subject, period };
}

export async function upsertExerciseBulletinGrade(
  tx: Tx,
  data: {
    studentId: string;
    subject: string;
    period: string;
    value: number;
    maxValue: number;
    teacherId: string | null;
  }
) {
  const existing = await tx.grade.findFirst({
    where: {
      studentId: data.studentId,
      subject: data.subject,
      period: data.period,
    },
  });

  if (existing) {
    await tx.grade.update({
      where: { id: existing.id },
      data: {
        value: data.value,
        maxValue: data.maxValue,
        teacherId: data.teacherId,
      },
    });
    return existing.id;
  }

  const created = await tx.grade.create({ data });
  return created.id;
}
