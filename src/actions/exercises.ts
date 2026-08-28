"use server";

import { revalidatePath } from "next/cache";
import { requireSession, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  ensureStudentsHavePrimaryClass,
  getStudentClassIds,
  resolvePersonalizedExerciseClassId,
  studentsInClassWhere,
} from "@/lib/student-enrollments";
import type { ExerciseAudienceType } from "@/lib/exercise-audience";
import { studentHasExerciseAccess, studentClassIds } from "@/lib/exercise-audience";
import { assertClassInScope, assertStudentInScope } from "@/lib/tenant-guards";
import { awardXp } from "@/lib/gamification";
import {
  canNotifyTeacherSubmission,
  notifyStudent,
  notifyStudentParents,
  notifyUser,
} from "@/lib/notifications";
import {
  parseOptions,
  isAutoGradableQuestionType,
  questionTypeNeedsOptions,
  type ChoiceOption,
  type ExerciseKind,
  type QuestionType,
} from "@/lib/exercises";
import { getSchoolSettings } from "@/lib/school-settings";
import { exerciseBulletinMeta, upsertExerciseBulletinGrade } from "@/lib/exercise-bulletin";
import { hasPermission } from "@/lib/permissions";
import { syncTrailAfterAction } from "@/lib/trails";
import { checkAndAwardClassGoals } from "@/lib/class-goals";

function revalidateExercises() {
  [
    "/dashboard/exercicios",
    "/dashboard/aluno",
    "/dashboard/professor",
    "/dashboard/responsavel",
  ].forEach((p) => revalidatePath(p, "page"));
}

type QuestionInput = {
  prompt: string;
  type: QuestionType;
  points: number;
  xpReward?: number;
  options?: ChoiceOption[];
};

function parseQuestionsJson(raw: string): QuestionInput[] {
  try {
    const parsed = JSON.parse(raw) as QuestionInput[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Adicione pelo menos uma questão.");
    }
    parsed.forEach((q, index) => {
      if (!q.prompt?.trim()) {
        throw new Error(`A questão ${index + 1} precisa de enunciado.`);
      }
      if (q.type === "choice") {
        const options = q.options ?? [];
        const filled = options.filter((option) => option.text?.trim());
        if (filled.length < 2) {
          throw new Error(`A questão ${index + 1} precisa de pelo menos duas alternativas.`);
        }
        if (!options.some((option) => option.isCorrect && option.text?.trim())) {
          throw new Error(`Marque a alternativa correta na questão ${index + 1}.`);
        }
      }
      if (q.type === "flashcard" && !q.options?.[0]?.text?.trim()) {
        throw new Error(`Informe o verso do cartão na questão ${index + 1}.`);
      }
    });
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message) throw error;
    throw new Error("Formato de questões inválido.");
  }
}

async function assertTeacherCanManageClass(user: SessionUser, classId: string | null) {
  if (!classId) return;
  const scope = await assertClassInScope(user, classId);
  if (!scope.ok) throw new Error(scope.error);
}

function parseAudienceType(raw: string): ExerciseAudienceType {
  return raw === "personalized" ? "personalized" : "class";
}

function parseStudentTargetIds(formData: FormData) {
  return [...new Set(formData.getAll("studentTargetIds").map((value) => String(value)).filter(Boolean))];
}

async function assertPersonalizedStudentTargets(user: SessionUser, studentIds: string[]) {
  if (studentIds.length === 0) {
    throw new Error("Selecione pelo menos um aluno para o exercício personalizado.");
  }

  await ensureStudentsHavePrimaryClass(studentIds);

  for (const studentId of studentIds) {
    const scope = await assertStudentInScope(user, studentId);
    if (!scope.ok) throw new Error(scope.error);

    const classIds = await getStudentClassIds(studentId);
    if (classIds.length === 0) {
      throw new Error(
        "Um ou mais alunos selecionados não estão matriculados em turma. Vincule o aluno a uma turma antes de publicar."
      );
    }
  }
}

async function notifyExerciseAudience(
  exercise: { id: string; kind: string; title: string; classGroup?: { name: string | null } | null },
  audienceType: ExerciseAudienceType,
  classId: string | null,
  studentTargetIds: string[]
) {
  const students =
    audienceType === "personalized"
      ? await prisma.student.findMany({
          where: { id: { in: studentTargetIds } },
          select: { id: true },
        })
      : await prisma.student.findMany({
          where: classId ? studentsInClassWhere(classId) : { id: { in: [] } },
          select: { id: true },
        });

  const kind = exercise.kind;
  for (const student of students) {
    await notifyStudent(
      student.id,
      kind === "exam" ? "Nova prova disponível" : "Novo exercício disponível",
      `${exercise.title} · ${exercise.classGroup?.name ?? "Turma"}`,
      `/dashboard/exercicios/${exercise.id}`
    );
    await notifyStudentParents(
      student.id,
      kind === "exam" ? "Nova prova do filho(a)" : "Novo exercício do filho(a)",
      `${exercise.title} · ${exercise.classGroup?.name ?? "Turma"}`,
      `/dashboard/responsavel/filho/${student.id}`,
      "exercise"
    );
  }
}

async function resolveExerciseClassId(
  schoolId: string,
  preferredClassId: string | null,
  studentTargetIds: string[]
) {
  const resolved = await resolvePersonalizedExerciseClassId(
    schoolId,
    studentTargetIds,
    preferredClassId
  );
  if (resolved.unassignedStudentIds.length > 0) {
    return null;
  }
  return resolved.classId;
}

export async function createExerciseAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? "homework") as ExerciseKind;
  let classId = String(formData.get("classId") ?? "") || null;
  const preferredClassId = String(formData.get("preferredClassId") ?? classId ?? "") || null;
  const maxPoints = parseFloat(String(formData.get("maxPoints") ?? "10"));
  const xpReward = parseInt(String(formData.get("xpReward") ?? "0"), 10);
  const coinReward = parseInt(String(formData.get("coinReward") ?? "0"), 10);
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const questionsJson = String(formData.get("questionsJson") ?? "");
  const studentTargetIds = parseStudentTargetIds(formData);
  const audienceType =
    studentTargetIds.length > 0
      ? "personalized"
      : parseAudienceType(String(formData.get("audienceType") ?? "class"));
  const personalizationTag = String(formData.get("personalizationTag") ?? "").trim() || null;

  if (!title) return { error: "Título é obrigatório." };
  if (audienceType === "personalized" && studentTargetIds.length === 0) {
    return { error: "Selecione pelo menos um aluno." };
  }
  if (audienceType === "class" && !classId) return { error: "Selecione uma turma." };
  if (isNaN(maxPoints) || maxPoints <= 0) return { error: "Pontuação máxima inválida." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.createExercises")) {
    return { error: "Sem permissão para criar exercícios." };
  }

  try {
    if (audienceType === "personalized") {
      await assertPersonalizedStudentTargets(user, studentTargetIds);
      classId = await resolveExerciseClassId(user.schoolId, preferredClassId, studentTargetIds);
      if (studentTargetIds.length === 1 && !classId) {
        return {
          error:
            "Não foi possível vincular turma ao aluno selecionado. Matricule-o em uma turma primeiro.",
        };
      }
      if (classId) {
        await assertTeacherCanManageClass(user, classId);
      }
    } else {
      await assertTeacherCanManageClass(user, classId);
    }
    const questions = parseQuestionsJson(questionsJson);

    const exercise = await prisma.exercise.create({
      data: {
        schoolId: user.schoolId,
        classId,
        teacherId: user.id,
        title,
        description,
        kind,
        audienceType,
        personalizationTag,
        maxPoints,
        xpReward: Math.max(0, xpReward),
        coinReward: Math.max(0, coinReward),
        dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
        questions: {
          create: questions.map((q, i) => ({
            prompt: q.prompt,
            type: q.type,
            points: q.points,
            xpReward: Math.max(0, q.xpReward ?? 0),
            sortOrder: i,
            options: questionTypeNeedsOptions(q.type) ? JSON.stringify(q.options ?? []) : null,
          })),
        },
        ...(audienceType === "personalized"
          ? {
              studentTargets: {
                create: studentTargetIds.map((studentId) => ({ studentId })),
              },
            }
          : {}),
      },
      include: { classGroup: { select: { name: true } } },
    });

    await notifyExerciseAudience(exercise, audienceType, classId, studentTargetIds);

    revalidateExercises();
    return { success: true, id: exercise.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar exercício." };
  }
}

export async function updateExerciseAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };
  const id = String(formData.get("id") ?? "");
  const exercise = await prisma.exercise.findFirst({
    where: { id, schoolId: user.schoolId },
  });
  if (!exercise) return { error: "Exercício não encontrado." };
  if (user.role === "teacher" && exercise.teacherId !== user.id) {
    return { error: "Sem permissão para editar." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? exercise.kind) as ExerciseKind;
  const maxPoints = parseFloat(String(formData.get("maxPoints") ?? String(exercise.maxPoints)));
  const xpReward = parseInt(String(formData.get("xpReward") ?? String(exercise.xpReward)), 10);
  const coinReward = parseInt(String(formData.get("coinReward") ?? String(exercise.coinReward)), 10);
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const isActive = formData.get("isActive") !== "false";
  const questionsJson = String(formData.get("questionsJson") ?? "");
  const classIdInput = String(formData.get("classId") ?? exercise.classId ?? "") || null;
  const preferredClassId =
    String(formData.get("preferredClassId") ?? classIdInput ?? "") || null;
  let classId = classIdInput;
  const studentTargetIds = parseStudentTargetIds(formData);
  const audienceType =
    studentTargetIds.length > 0
      ? "personalized"
      : parseAudienceType(String(formData.get("audienceType") ?? exercise.audienceType ?? "class"));
  const personalizationTag = String(formData.get("personalizationTag") ?? exercise.personalizationTag ?? "").trim() || null;

  if (!title) return { error: "Título é obrigatório." };
  if (audienceType === "personalized" && studentTargetIds.length === 0) {
    return { error: "Selecione pelo menos um aluno." };
  }
  if (audienceType === "class" && !classId) return { error: "Selecione uma turma." };

  try {
    if (audienceType === "personalized") {
      await assertPersonalizedStudentTargets(user, studentTargetIds);
      classId = await resolveExerciseClassId(user.schoolId, preferredClassId, studentTargetIds);
      if (studentTargetIds.length === 1 && !classId) {
        return { error: "Não foi possível vincular turma ao aluno selecionado." };
      }
      if (classId) {
        await assertTeacherCanManageClass(user, classId);
      }
    } else {
      await assertTeacherCanManageClass(user, classId);
    }
    const questions = questionsJson ? parseQuestionsJson(questionsJson) : null;

    await prisma.$transaction(async (tx) => {
      await tx.exercise.update({
        where: { id },
        data: {
          title,
          description,
          kind,
          classId,
          audienceType,
          personalizationTag,
          maxPoints,
          xpReward: Math.max(0, xpReward),
          coinReward: Math.max(0, coinReward),
          dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
          isActive,
        },
      });

      await tx.exerciseStudentTarget.deleteMany({ where: { exerciseId: id } });
      if (audienceType === "personalized") {
        await tx.exerciseStudentTarget.createMany({
          data: studentTargetIds.map((studentId) => ({ exerciseId: id, studentId })),
        });
      }

      if (questions) {
        await tx.exerciseQuestion.deleteMany({ where: { exerciseId: id } });
        await tx.exerciseQuestion.createMany({
          data: questions.map((q, i) => ({
            exerciseId: id,
            prompt: q.prompt,
            type: q.type,
            points: q.points,
            xpReward: Math.max(0, q.xpReward ?? 0),
            sortOrder: i,
            options: questionTypeNeedsOptions(q.type) ? JSON.stringify(q.options ?? []) : null,
          })),
        });
      }
    });

    revalidateExercises();
    revalidatePath(`/dashboard/exercicios/${id}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao atualizar." };
  }
}

export async function submitExerciseAction(formData: FormData) {
  const user = await requireSession(["student"]);
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const answersJson = String(formData.get("answersJson") ?? "");

  if (!user.schoolId) return { error: "Escola não configurada." };

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: {
      classEnrollments: {
        where: { status: { in: ["active", "locked"] } },
        select: { classId: true, status: true },
      },
    },
  });
  if (!student) return { error: "Perfil de aluno não encontrado." };

  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      isActive: true,
      schoolId: user.schoolId,
    },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      classGroup: { select: { name: true } },
      studentTargets: { select: { studentId: true } },
    },
  });
  if (!exercise) return { error: "Exercício não encontrado." };
  if (!(await studentHasExerciseAccess(exercise, student))) {
    return { error: "Exercício não disponível para você." };
  }

  if (exercise.dueDate && new Date() > exercise.dueDate) {
    return { error: "Prazo encerrado para este exercício." };
  }

  const existing = await prisma.exerciseSubmission.findUnique({
    where: { exerciseId_studentId: { exerciseId, studentId: student.id } },
  });
  if (existing?.status === "graded") {
    return { error: "Este exercício já foi corrigido." };
  }

  let answers: Record<string, { textAnswer?: string; selectedOptionId?: string }>;
  try {
    answers = JSON.parse(answersJson);
  } catch {
    return { error: "Respostas inválidas." };
  }

  const settings = await getSchoolSettings(user.schoolId);
  const allAutoGradable =
    settings.exercises.autoGradeEnabled &&
    exercise.questions.every((q) => isAutoGradableQuestionType(q.type));
  const maxScore = exercise.questions.reduce((s, q) => s + q.points, 0);
  const maxGrade = settings.academic.maxGrade;

  const answerRows = exercise.questions.map((q) => {
    const a = answers[q.id] ?? {};
    let isCorrect: boolean | null = null;
    let pointsAwarded: number | null = null;

    if (q.type === "choice" || q.type === "true_false") {
      const opts = parseOptions(q.options);
      const correct = opts.find((o) => o.isCorrect);
      isCorrect = correct ? a.selectedOptionId === correct.id : false;
      pointsAwarded = isCorrect ? q.points : 0;
    } else if (q.type === "flashcard") {
      isCorrect = a.selectedOptionId === "knew";
      pointsAwarded = isCorrect ? q.points : 0;
    }

    return {
      questionId: q.id,
      textAnswer: a.textAnswer?.trim() || null,
      selectedOptionId: a.selectedOptionId || null,
      isCorrect,
      pointsAwarded,
    };
  });

  const autoScore = allAutoGradable
    ? answerRows.reduce((s, r) => s + (r.pointsAwarded ?? 0), 0)
    : null;

  let submissionId = existing?.id ?? "";

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.exerciseAnswer.deleteMany({ where: { submissionId: existing.id } });
      await tx.exerciseSubmission.update({
        where: { id: existing.id },
        data: allAutoGradable
          ? {
              status: "graded",
              submittedAt: new Date(),
              score: autoScore,
              maxScore,
              gradedAt: new Date(),
              gradedById: exercise.teacherId,
              feedback: "Correção automática (múltipla escolha).",
            }
          : {
              status: "submitted",
              submittedAt: new Date(),
              score: null,
              gradedAt: null,
              gradedById: null,
              feedback: null,
            },
      });
      await tx.exerciseAnswer.createMany({
        data: answerRows.map((r) => ({ submissionId: existing.id, ...r })),
      });
      submissionId = existing.id;
    } else {
      const sub = await tx.exerciseSubmission.create({
        data: {
          exerciseId,
          studentId: student.id,
          status: allAutoGradable ? "graded" : "submitted",
          maxScore,
          score: autoScore,
          gradedAt: allAutoGradable ? new Date() : null,
          gradedById: allAutoGradable ? exercise.teacherId : null,
          feedback: allAutoGradable ? "Correção automática (múltipla escolha)." : null,
        },
      });
      await tx.exerciseAnswer.createMany({
        data: answerRows.map((r) => ({ submissionId: sub.id, ...r })),
      });
      submissionId = sub.id;
    }

    if (allAutoGradable && autoScore != null && settings.exercises.postGradeToBulletin) {
      const { subject, period } = exerciseBulletinMeta(exercise, settings.academic.periods);
      await upsertExerciseBulletinGrade(tx, {
        studentId: student.id,
        subject,
        period,
        value: maxScore > 0 ? (autoScore / maxScore) * maxGrade : 0,
        maxValue: maxGrade,
        teacherId: exercise.teacherId,
      });
    }
  });

  const studentName = user.fullName;

  if (allAutoGradable && autoScore != null) {
    const sumQuestionXp = exercise.questions.reduce((s, q) => s + (q.xpReward ?? 0), 0);
    const ratio = maxScore > 0 ? autoScore / maxScore : 0;
    const xp = sumQuestionXp > 0
      ? answerRows.reduce((acc, r) => {
          const q = exercise.questions.find((item) => item.id === r.questionId);
          return acc + (r.isCorrect && q ? (q.xpReward ?? 0) : 0);
        }, 0)
      : Math.round(exercise.xpReward * ratio);
    const coins = Math.round(exercise.coinReward * ratio);
    if (xp > 0 || coins > 0) {
      await awardXp(
        student.id,
        xp,
        `${exercise.kind === "exam" ? "Prova" : "Exercício"}: ${exercise.title} (${autoScore.toFixed(1)}/${maxScore})`,
        "exercise",
        coins,
        settings
      );
    }

    await notifyStudent(
      student.id,
      "Resultado imediato!",
      `${exercise.title}: ${autoScore.toFixed(1)}/${maxScore} pts  -  XP e moedas creditados.`,
      `/dashboard/exercicios/${exerciseId}`
    );
    await notifyStudentParents(
      student.id,
      "Atividade corrigida automaticamente",
      `${studentName} · ${exercise.title}: ${autoScore.toFixed(1)}/${maxScore} pts`,
      `/dashboard/responsavel/filho/${student.id}`,
      "exerciseGraded"
    );
    if (await canNotifyTeacherSubmission(user.schoolId)) {
      await notifyUser(
        exercise.teacherId,
        "Entrega auto-corrigida",
        `${studentName} concluiu "${exercise.title}" (${autoScore.toFixed(1)}/${maxScore})`,
        `/dashboard/exercicios/${exerciseId}`
      );
    }
  } else {
    if (await canNotifyTeacherSubmission(user.schoolId)) {
      await notifyUser(
        exercise.teacherId,
        "Nova entrega para corrigir",
        `${studentName} enviou "${exercise.title}"`,
        `/dashboard/exercicios/${exerciseId}`
      );
    }
    await notifyStudentParents(
      student.id,
      "Atividade enviada",
      `${studentName} entregou: ${exercise.title}`,
      `/dashboard/responsavel/filho/${student.id}`,
      "exercise"
    );
  }

  // Sem revalidate aqui — evita trocar a UI antes da animação SAO (router.refresh no cliente).
  await syncTrailAfterAction(student.id, "exercise", exerciseId);
  if (student.classId) await checkAndAwardClassGoals(student.classId);

  return {
    success: true,
    autoGraded: allAutoGradable,
    score: autoScore,
    maxScore,
    submissionId,
  };
}

export async function gradeSubmissionAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  const submissionId = String(formData.get("submissionId") ?? "");
  const feedback = String(formData.get("feedback") ?? "").trim() || null;
  const gradesJson = String(formData.get("gradesJson") ?? "");

  const submission = await prisma.exerciseSubmission.findUnique({
    where: { id: submissionId },
    include: {
      exercise: { include: { questions: true, classGroup: { select: { name: true } } } },
      student: true,
      answers: true,
    },
  });
  if (!submission || submission.exercise.schoolId !== user.schoolId) {
    return { error: "Entrega não encontrada." };
  }
  if (user.role === "teacher" && submission.exercise.teacherId !== user.id) {
    return { error: "Sem permissão para corrigir." };
  }

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.gradeExercises")) {
    return { error: "Sem permissão para corrigir exercícios." };
  }

  let grades: Record<string, { points: number; isCorrect?: boolean }>;
  try {
    grades = JSON.parse(gradesJson);
  } catch {
    return { error: "Notas inválidas." };
  }

  let totalScore = 0;
  const maxScore = submission.exercise.questions.reduce((s, q) => s + q.points, 0);
  const maxGrade = settings.academic.maxGrade;

  await prisma.$transaction(async (tx) => {
    for (const answer of submission.answers) {
      const g = grades[answer.questionId];
      const pts = g ? Math.max(0, Math.min(g.points, submission.exercise.questions.find((q) => q.id === answer.questionId)?.points ?? 0)) : 0;
      totalScore += pts;
      await tx.exerciseAnswer.update({
        where: { id: answer.id },
        data: {
          pointsAwarded: pts,
          isCorrect: g?.isCorrect ?? pts > 0,
        },
      });
    }

    await tx.exerciseSubmission.update({
      where: { id: submissionId },
      data: {
        status: "graded",
        score: totalScore,
        maxScore,
        feedback,
        gradedAt: new Date(),
        gradedById: user.id,
      },
    });

    if (settings.exercises.postGradeToBulletin) {
      const { subject, period } = exerciseBulletinMeta(
        submission.exercise,
        settings.academic.periods
      );
      await upsertExerciseBulletinGrade(tx, {
        studentId: submission.studentId,
        subject,
        period,
        value: maxScore > 0 ? (totalScore / maxScore) * maxGrade : 0,
        maxValue: maxGrade,
        teacherId: user.id,
      });
    }
  });

  const sumQuestionXp = submission.exercise.questions.reduce((s, q) => s + (q.xpReward ?? 0), 0);
  const ratio = maxScore > 0 ? totalScore / maxScore : 0;
  let xp = 0;
  if (sumQuestionXp > 0) {
    for (const answer of submission.answers) {
      const q = submission.exercise.questions.find((item) => item.id === answer.questionId);
      const g = grades[answer.questionId];
      const pts = g ? Math.max(0, Math.min(g.points, q?.points ?? 0)) : 0;
      const qMaxPts = q?.points ?? 1;
      const qRatio = qMaxPts > 0 ? pts / qMaxPts : 0;
      xp += Math.round((q?.xpReward ?? 0) * qRatio);
    }
  } else {
    xp = Math.round(submission.exercise.xpReward * ratio);
  }
  const coins = Math.round(submission.exercise.coinReward * ratio);

  if (xp > 0 || coins > 0) {
    await awardXp(
      submission.studentId,
      xp,
      `${submission.exercise.kind === "exam" ? "Prova" : "Exercício"}: ${submission.exercise.title} (${totalScore.toFixed(1)}/${maxScore})`,
      "exercise",
      coins,
      settings
    );
  }

  await notifyStudent(
    submission.studentId,
    "Exercício corrigido",
    `${submission.exercise.title}: ${totalScore.toFixed(1)}/${maxScore} pts`,
    `/dashboard/exercicios/${submission.exerciseId}`
  );
  await notifyStudentParents(
    submission.studentId,
    "Atividade corrigida",
    `${submission.exercise.title}: ${totalScore.toFixed(1)}/${maxScore} pts`,
    `/dashboard/responsavel/filho/${submission.studentId}`,
    "exerciseGraded"
  );

  revalidateExercises();
  revalidatePath(`/dashboard/alunos/${submission.studentId}/boletim`);
  revalidatePath(`/dashboard/exercicios/${submission.exerciseId}`);

  await syncTrailAfterAction(submission.studentId, "exercise", submission.exerciseId);
  if (submission.student.classId) await checkAndAwardClassGoals(submission.student.classId);

  return { success: true };
}

export async function toggleExerciseAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };
  const id = String(formData.get("id") ?? "");
  const exercise = await prisma.exercise.findFirst({
    where: { id, schoolId: user.schoolId },
  });
  if (!exercise) return { error: "Não encontrado." };
  if (user.role === "teacher" && exercise.teacherId !== user.id) {
    return { error: "Sem permissão." };
  }

  await prisma.exercise.update({
    where: { id },
    data: { isActive: !exercise.isActive },
  });

  revalidateExercises();
  return { success: true };
}

export async function deleteExerciseAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Exercício inválido." };

  const exercise = await prisma.exercise.findFirst({
    where: { id, schoolId: user.schoolId },
  });
  if (!exercise) return { error: "Exercício não encontrado." };
  if (user.role === "teacher" && exercise.teacherId !== user.id) {
    return { error: "Sem permissão para excluir este exercício." };
  }

  await prisma.exercise.delete({ where: { id } });

  revalidateExercises();
  return { success: true };
}
