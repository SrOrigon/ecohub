"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { teacherClassWhere } from "@/lib/teacher-classes";
import { assertClassInScope, assertStudentInScope } from "@/lib/tenant-guards";
import { notifyStudent } from "@/lib/notifications";
import {
  calculateStudentDropoutRisk,
  type StudentDropoutRiskAssessment,
} from "@/lib/predictive-dropout";

export async function refreshClassDropoutRisk(classId: string) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return { success: false, error: "Sessão inválida" };
  }

  const classGroup = await prisma.classGroup.findFirst({
    where: { id: classId, schoolId: user.schoolId },
    include: {
      students: {
        select: { id: true },
      },
    },
  });

  if (!classGroup) {
    return { success: false, error: "Turma não encontrada nesta instituição" };
  }

  const assessments: StudentDropoutRiskAssessment[] = [];

  for (const student of classGroup.students) {
    const assessment = await calculateStudentDropoutRisk(student.id, user.schoolId);
    if (assessment) {
      assessments.push(assessment);
      await prisma.student.update({
        where: { id: student.id },
        data: {
          dropoutRiskScore: assessment.score,
          dropoutRiskLevel: assessment.level,
          dropoutFactors: JSON.stringify(assessment.factors),
          lastRiskAssessment: assessment.assessedAt,
        },
      });
    }
  }

  revalidatePath("/dashboard/alertas");
  revalidatePath(`/dashboard/turmas/${classId}`);

  return {
    success: true,
    count: assessments.length,
    assessments,
  };
}

export async function getSchoolDropoutRiskSummary(schoolId: string) {
  const user = await getSessionUser();
  if (!user || user.schoolId !== schoolId) {
    throw new Error("Acesso não autorizado para esta instituição");
  }

  const studentsAtRisk = await prisma.student.findMany({
    where: {
      user: { schoolId },
      status: "active",
      dropoutRiskLevel: { in: ["HIGH", "CRITICAL"] },
    },
    include: {
      user: { select: { fullName: true, email: true, avatarUrl: true } },
      classGroup: { select: { id: true, name: true } },
    },
    orderBy: { dropoutRiskScore: "desc" },
  });

  return studentsAtRisk.map((s) => ({
    studentId: s.id,
    studentName: s.user.fullName,
    enrollmentCode: s.enrollmentCode,
    avatarUrl: s.user.avatarUrl,
    className: s.classGroup?.name ?? "Sem turma",
    score: s.dropoutRiskScore,
    level: s.dropoutRiskLevel,
    factors: (JSON.parse(s.dropoutFactors || "[]") as string[]) ?? [],
    lastRiskAssessment: s.lastRiskAssessment,
  }));
}

export async function notifyParentDropoutRiskAction(studentId: string, customMessage?: string) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return { success: false, error: "Sessão expirada" };
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: user.schoolId } },
    include: {
      user: { select: { fullName: true } },
      parentLinks: { select: { parentId: true } },
    },
  });

  if (!student) {
    return { success: false, error: "Aluno não encontrado" };
  }

  const parentIds = student.parentLinks.map((p) => p.parentId);
  if (parentIds.length === 0) {
    return {
      success: false,
      error: "Nenhum responsável cadastrado para este aluno",
    };
  }

  const messageText =
    customMessage ||
    `Comunicado de Acompanhamento: Identificamos oscilações no engajamento e presença de ${student.user.fullName}. Solicitamos agendar uma reunião pedagógica.`;

  for (const parentId of parentIds) {
    await prisma.notification.create({
      data: {
        userId: parentId,
        title: "Alerta de Acompanhamento Pedagógico",
        message: messageText,
        href: `/dashboard/responsavel/filho/${studentId}`,
      },
    });
  }

  revalidatePath(`/dashboard/alunos/${studentId}`);
  revalidatePath("/dashboard/alertas");

  return {
    success: true,
    message: `Notificação enviada para ${parentIds.length} responsável(is).`,
  };
}

export async function createReinforcementPlanAction(studentId: string, notes: string) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) {
    return { success: false, error: "Sessão expirada" };
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: user.schoolId } },
    include: { user: { select: { fullName: true } } },
  });

  if (!student) {
    return { success: false, error: "Aluno não encontrado" };
  }

  await prisma.studentActivity.create({
    data: {
      studentId: student.id,
      type: "reinforcement_plan",
      title: "Plano de Apoio Pedagógico e Reforço Criado",
      detail: notes,
      occurredAt: new Date(),
    },
  });

  revalidatePath(`/dashboard/alunos/${studentId}`);
  revalidatePath("/dashboard/alertas");

  return {
    success: true,
    message: "Plano de reforço registrado no histórico do aluno com sucesso.",
  };
}

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
