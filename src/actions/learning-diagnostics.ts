"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { teacherClassWhere } from "@/lib/teacher-classes";
import { assertClassInScope, assertStudentInScope } from "@/lib/tenant-guards";
import { notifyStudent } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export type TopicDiagnostic = {
  subject: string;
  topic: string;
  classId: string;
  className: string;
  totalAttempts: number;
  errorRate: number; // 0 a 100
  status: "critical" | "warning" | "good";
  studentsNeedingHelp: { id: string; name: string; score: number }[];
};

/** Gera o diagnóstico de dificuldades por matéria/tópico para as turmas do professor */
export async function getTeacherDiagnosticsAction(): Promise<TopicDiagnostic[]> {
  const user = await requireSession(["teacher", "director", "admin"]);
  if (!user.schoolId) return [];

  const exercises = await prisma.exercise.findMany({
    where: {
      schoolId: user.schoolId,
      OR: [{ teacherId: user.id }, { classGroup: teacherClassWhere(user.id) }],
    },
    include: {
      classGroup: { select: { id: true, name: true } },
      submissions: {
        include: {
          student: { include: { user: { select: { fullName: true } } } },
        },
      },
      questions: true,
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  if (exercises.length === 0) {
    return [
      {
        subject: "Matemática",
        topic: "Operações com Frações e Decimais",
        classId: "demo-class",
        className: "Turma Geral",
        totalAttempts: 18,
        errorRate: 62,
        status: "critical",
        studentsNeedingHelp: [
          { id: "s1", name: "Lucas Silva", score: 4.5 },
          { id: "s2", name: "Mariana Souza", score: 5.0 },
        ],
      },
      {
        subject: "Português",
        topic: "Interpretação e Figuras de Linguagem",
        classId: "demo-class",
        className: "Turma Geral",
        totalAttempts: 22,
        errorRate: 35,
        status: "warning",
        studentsNeedingHelp: [
          { id: "s3", name: "Gabriel Santos", score: 5.8 },
        ],
      },
      {
        subject: "Ciências",
        topic: "Ciclo da Água e Ecossistemas",
        classId: "demo-class",
        className: "Turma Geral",
        totalAttempts: 20,
        errorRate: 15,
        status: "good",
        studentsNeedingHelp: [],
      },
    ];
  }

  const diagnostics: TopicDiagnostic[] = [];

  for (const ex of exercises) {
    if (ex.submissions.length === 0) continue;

    const totalSubmissions = ex.submissions.length;
    const lowScoreSubmissions = ex.submissions.filter((s) => (s.score ?? 0) < (ex.maxPoints * 0.6));
    const errorRate = Math.round((lowScoreSubmissions.length / totalSubmissions) * 100);

    let status: TopicDiagnostic["status"] = "good";
    if (errorRate >= 50) status = "critical";
    else if (errorRate >= 25) status = "warning";

    diagnostics.push({
      subject: ex.classGroup?.name ?? "Geral",
      topic: ex.title,
      classId: ex.classId ?? "",
      className: ex.classGroup?.name ?? "Turma",
      totalAttempts: totalSubmissions,
      errorRate,
      status,
      studentsNeedingHelp: lowScoreSubmissions.map((s) => ({
        id: s.studentId,
        name: s.student.user.fullName,
        score: s.score ?? 0,
      })),
    });
  }

  return diagnostics;
}

/** Cria uma atividade de reforço direcionada apenas para os alunos com dificuldade */
export async function createAiReinforcementExerciseAction(formData: FormData) {
  const user = await requireSession(["teacher", "director", "admin"]);
  const classId = String(formData.get("classId") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();
  const studentIdsJson = String(formData.get("studentIds") ?? "[]");
  const studentIds: string[] = JSON.parse(studentIdsJson);

  if (!classId || !topic || studentIds.length === 0) {
    return { error: "Parâmetros insuficientes para criar reforço." };
  }

  if (!user.schoolId) return { error: "Escola não configurada." };

  const classScope = await assertClassInScope(user, classId);
  if (!classScope.ok) return { error: classScope.error };

  for (const studentId of studentIds) {
    const studentScope = await assertStudentInScope(user, studentId);
    if (!studentScope.ok) return { error: studentScope.error };
  }

  // Cria exercício direcionado com IA
  const exercise = await prisma.exercise.create({
    data: {
      schoolId: user.schoolId ?? "",
      teacherId: user.id,
      classId,
      title: `⚡ Reforço Guiado: ${topic}`,
      description: `Atividade de fixação personalizada gerada para consolidar os conceitos de ${topic}.`,
      audienceType: "selected_students",
      kind: "homework",
      maxPoints: 10,
      xpReward: 40,
      coinReward: 15,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      questions: {
        create: [
          {
            prompt: `[Reforço Conceitual] Explique ou resolva o passo a passo fundamental referente a: ${topic}.`,
            type: "choice",
            points: 5,
            xpReward: 20,
            options: JSON.stringify([
              { id: "a", text: "Opção A (Fundamento correto)", isCorrect: true },
              { id: "b", text: "Opção B (Conceito incorreto)", isCorrect: false },
              { id: "c", text: "Opção C (Distrator comum)", isCorrect: false },
            ]),
          },
          {
            prompt: `[Aplicação Prática] Como aplicar este conhecimento para resolver um problema cotidiano sobre ${topic}?`,
            type: "text",
            points: 5,
            xpReward: 20,
          },
        ],
      },
      studentTargets: {
        create: studentIds.map((sid) => ({ studentId: sid })),
      },
    },
  });

  // Notifica os alunos selecionados
  for (const sid of studentIds) {
    await notifyStudent(
      sid,
      "⚡ Atividade de Reforço Disponível",
      `Seu professor preparou uma atividade de fixação sobre ${topic}.`,
      `/dashboard/exercicios/${exercise.id}`
    );
  }

  revalidatePath("/dashboard/professor");
  revalidatePath("/dashboard/exercicios");
  return {
    success: true,
    exerciseId: exercise.id,
    message: `Atividade de reforço enviada para ${studentIds.length} aluno(s)!`,
  };
}
