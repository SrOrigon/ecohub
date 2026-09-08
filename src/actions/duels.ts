"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyStudent } from "@/lib/notifications";
import { assertClassInScope } from "@/lib/tenant-guards";
import { getStudentClassIds, studentsInClassWhere } from "@/lib/student-enrollments";
import { calculateLevel } from "@/lib/gamification";
import { getSchoolSettingsForStudent } from "@/lib/school-settings";
import { revalidatePath } from "next/cache";

export type DuelQuestion = {
  id: string;
  statement: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation?: string;
};

const DEFAULT_FALLBACK_QUESTIONS: DuelQuestion[] = [
  {
    id: "q1",
    statement: "Qual é o principal gás absorvido pelas plantas durante a fotossíntese?",
    options: [
      { id: "a", text: "Oxigênio" },
      { id: "b", text: "Dióxido de carbono (CO2)" },
      { id: "c", text: "Nitrogênio" },
      { id: "d", text: "Hélio" },
    ],
    correctOptionId: "b",
  },
  {
    id: "q2",
    statement: "Qual é o resultado da operação: 8 × 7 - 16?",
    options: [
      { id: "a", text: "40" },
      { id: "b", text: "42" },
      { id: "c", text: "48" },
      { id: "d", text: "56" },
    ],
    correctOptionId: "a",
  },
  {
    id: "q3",
    statement: "Em qual continente fica localizada a Floresta Amazônica?",
    options: [
      { id: "a", text: "América do Sul" },
      { id: "b", text: "África" },
      { id: "c", text: "Ásia" },
      { id: "d", text: "Europa" },
    ],
    correctOptionId: "a",
  },
  {
    id: "q4",
    statement: "Qual das seguintes palavras é um verbo no infinitivo?",
    options: [
      { id: "a", text: "Caminhar" },
      { id: "b", text: "Caminho" },
      { id: "c", text: "Caminhante" },
      { id: "d", text: "Caminhada" },
    ],
    correctOptionId: "a",
  },
  {
    id: "q5",
    statement: "Quantos minutos há em 3 horas e meia?",
    options: [
      { id: "a", text: "180 min" },
      { id: "b", text: "210 min" },
      { id: "c", text: "240 min" },
      { id: "d", text: "200 min" },
    ],
    correctOptionId: "b",
  },
];

function answersSubmitted(json: string) {
  return json.trim() !== "" && json.trim() !== "[]";
}

async function assertStudentsShareClass(studentIdA: string, studentIdB: string, classId: string) {
  const [classIdsA, classIdsB] = await Promise.all([
    getStudentClassIds(studentIdA),
    getStudentClassIds(studentIdB),
  ]);
  return classIdsA.includes(classId) && classIdsB.includes(classId);
}

/** Professor abre a Arena de Duelos para a sua turma */
export async function startTeacherDuelSessionAction(formData: FormData) {
  const user = await requireSession(["teacher", "director", "admin"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const classId = String(formData.get("classId") ?? "").trim();
  const maxBetCoins = Math.min(100, Math.max(0, Number(formData.get("maxBetCoins") ?? 30)));
  const maxBetXp = Math.min(100, Math.max(0, Number(formData.get("maxBetXp") ?? 30)));

  if (!classId) return { error: "Selecione uma turma." };

  const scope = await assertClassInScope(user, classId);
  if (!scope.ok) return { error: scope.error };

  if (user.role === "teacher") {
    const ownsClass = await prisma.classGroup.findFirst({
      where: { id: classId, schoolId: user.schoolId, teacherId: user.id },
      select: { id: true },
    });
    if (!ownsClass) return { error: "Sem permissão para liberar duelos nesta turma." };
  }

  await prisma.duelSession.updateMany({
    where: { classId, schoolId: user.schoolId, isActive: true },
    data: { isActive: false },
  });

  const session = await prisma.duelSession.create({
    data: {
      schoolId: user.schoolId,
      classId,
      teacherId: user.id,
      isActive: true,
      maxBetCoins,
      maxBetXp,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  revalidatePath("/dashboard/professor");
  revalidatePath("/dashboard/aluno");
  return { success: true, sessionId: session.id };
}

/** Professor altera o teto de moedas/XP da arena já aberta. */
export async function updateTeacherDuelSessionLimitsAction(formData: FormData) {
  const user = await requireSession(["teacher", "director", "admin"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const maxBetCoins = Math.min(100, Math.max(0, Number(formData.get("maxBetCoins") ?? 30)));
  const maxBetXp = Math.min(100, Math.max(0, Number(formData.get("maxBetXp") ?? 30)));
  if (!sessionId) return { error: "Sessão inválida." };

  const session = await prisma.duelSession.findFirst({
    where: { id: sessionId, schoolId: user.schoolId, isActive: true },
    select: { id: true, classId: true, teacherId: true },
  });
  if (!session) return { error: "Sessão ativa não encontrada." };

  if (user.role === "teacher" && session.teacherId !== user.id) {
    return { error: "Sem permissão para alterar esta sessão." };
  }

  const scope = await assertClassInScope(user, session.classId);
  if (!scope.ok) return { error: scope.error };

  await prisma.duelSession.update({
    where: { id: session.id },
    data: { maxBetCoins, maxBetXp },
  });

  revalidatePath("/dashboard/professor");
  revalidatePath("/dashboard/aluno");
  return { success: true };
}

/** Professor encerra a Arena de Duelos */
export async function closeTeacherDuelSessionAction(formData: FormData) {
  const user = await requireSession(["teacher", "director", "admin"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) return { error: "Sessão inválida." };

  const session = await prisma.duelSession.findFirst({
    where: { id: sessionId, schoolId: user.schoolId },
    select: { id: true, classId: true, teacherId: true },
  });
  if (!session) return { error: "Sessão não encontrada." };

  if (user.role === "teacher" && session.teacherId !== user.id) {
    return { error: "Sem permissão para encerrar esta sessão." };
  }

  const scope = await assertClassInScope(user, session.classId);
  if (!scope.ok) return { error: scope.error };

  await prisma.duelSession.update({
    where: { id: sessionId },
    data: { isActive: false },
  });

  revalidatePath("/dashboard/professor");
  revalidatePath("/dashboard/aluno");
  return { success: true };
}

/** Aluno cria um desafio 1v1 contra um colega da mesma turma */
export async function createDuelChallengeAction(formData: FormData) {
  const user = await requireSession(["student"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const challengedStudentId = String(formData.get("challengedStudentId") ?? "").trim();
  const betCoins = Math.max(0, Number(formData.get("betCoins") ?? 0));
  const betXp = Math.max(0, Number(formData.get("betXp") ?? 0));

  const challenger = await prisma.student.findFirst({
    where: { userId: user.id, user: { schoolId: user.schoolId } },
  });
  if (!challenger) return { error: "Perfil de aluno não encontrado." };

  if (challenger.id === challengedStudentId) {
    return { error: "Você não pode duelar contra si mesmo!" };
  }

  const classIds = await getStudentClassIds(challenger.id);
  const classId = classIds[0] ?? challenger.classId;
  if (!classId) {
    return { error: "Você precisa estar vinculado a uma turma para duelar." };
  }

  const activeSession = await prisma.duelSession.findFirst({
    where: {
      classId,
      schoolId: user.schoolId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (!activeSession) {
    return {
      error:
        "A Arena de Duelos não está autorizada no momento. Peça ao professor para liberar a sessão durante a aula!",
    };
  }

  if (betCoins > activeSession.maxBetCoins || betXp > activeSession.maxBetXp) {
    return {
      error: `A aposta máxima autorizada pelo professor é de ${activeSession.maxBetCoins} moedas e ${activeSession.maxBetXp} XP.`,
    };
  }

  if (challenger.coins < betCoins || challenger.xpTotal < betXp) {
    return { error: "Você não tem saldo suficiente de moedas ou XP para esta aposta." };
  }

  const challenged = await prisma.student.findFirst({
    where: {
      id: challengedStudentId,
      user: { schoolId: user.schoolId },
      ...studentsInClassWhere(classId),
    },
    include: { user: true },
  });
  if (!challenged) return { error: "Colega desafiado não encontrado nesta turma." };

  const sameClass = await assertStudentsShareClass(challenger.id, challenged.id, classId);
  if (!sameClass) return { error: "O duelo só pode ocorrer entre alunos da mesma turma." };

  if (challenged.coins < betCoins || challenged.xpTotal < betXp) {
    return { error: `${challenged.user.fullName} não possui saldo suficiente para esta aposta.` };
  }

  const questions = [...DEFAULT_FALLBACK_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 3);

  const match = await prisma.duelMatch.create({
    data: {
      schoolId: user.schoolId,
      classId,
      sessionId: activeSession.id,
      challengerId: challenger.id,
      challengedId: challenged.id,
      betCoins,
      betXp,
      status: "pending",
      questionsJson: JSON.stringify(questions),
    },
  });

  await notifyStudent(
    challenged.id,
    "⚔️ Desafio de Conhecimento 1v1!",
    `${user.fullName} te desafiou para um duelo de ${betCoins} moedas e ${betXp} XP!`,
    "/dashboard/aluno"
  );

  revalidatePath("/dashboard/aluno");
  return { success: true, matchId: match.id };
}

/** Aluno aceita ou rejeita o desafio */
export async function respondDuelChallengeAction(formData: FormData) {
  const user = await requireSession(["student"]);
  const matchId = String(formData.get("matchId") ?? "").trim();
  const accept = String(formData.get("accept") ?? "") === "true";

  const student = await prisma.student.findFirst({ where: { userId: user.id } });
  if (!student) return { error: "Aluno não encontrado." };

  const match = await prisma.duelMatch.findUnique({
    where: { id: matchId },
    include: { challenger: { include: { user: true } } },
  });
  if (!match || match.challengedId !== student.id || match.schoolId !== user.schoolId) {
    return { error: "Desafio inválido ou não destinado a você." };
  }

  if (match.status !== "pending") {
    return { error: "Este desafio já foi respondido." };
  }

  if (!accept) {
    await prisma.duelMatch.update({
      where: { id: matchId },
      data: { status: "rejected" },
    });
    await notifyStudent(
      match.challengerId,
      "Duelo recusado",
      `${user.fullName} recusou o desafio de duelo.`,
      "/dashboard/aluno"
    );
    revalidatePath("/dashboard/aluno");
    return { success: true, status: "rejected" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const activated = await tx.duelMatch.updateMany({
        where: { id: matchId, status: "pending" },
        data: { status: "active" },
      });
      if (activated.count === 0) throw new Error("ALREADY_RESPONDED");

      if (match.betCoins > 0) {
        const c1 = await tx.student.updateMany({
          where: { id: match.challengerId, coins: { gte: match.betCoins } },
          data: { coins: { decrement: match.betCoins } },
        });
        const c2 = await tx.student.updateMany({
          where: { id: match.challengedId, coins: { gte: match.betCoins } },
          data: { coins: { decrement: match.betCoins } },
        });
        if (c1.count === 0 || c2.count === 0) throw new Error("INSUFFICIENT_COINS");
      }

      if (match.betXp > 0) {
        const x1 = await tx.student.updateMany({
          where: { id: match.challengerId, xpTotal: { gte: match.betXp } },
          data: { xpTotal: { decrement: match.betXp } },
        });
        const x2 = await tx.student.updateMany({
          where: { id: match.challengedId, xpTotal: { gte: match.betXp } },
          data: { xpTotal: { decrement: match.betXp } },
        });
        if (x1.count === 0 || x2.count === 0) throw new Error("INSUFFICIENT_XP");
      }
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "ALREADY_RESPONDED") return { error: "Este desafio já foi respondido." };
    if (msg === "INSUFFICIENT_COINS" || msg === "INSUFFICIENT_XP") {
      await prisma.duelMatch.updateMany({
        where: { id: matchId, status: "pending" },
        data: { status: "cancelled" },
      });
      return { error: "Saldo insuficiente para iniciar o duelo." };
    }
    throw error;
  }

  revalidatePath("/dashboard/aluno");
  return { success: true, status: "active" };
}

/** Aluno envia respostas do duelo */
export async function submitDuelAnswersAction(formData: FormData) {
  const user = await requireSession(["student"]);
  const matchId = String(formData.get("matchId") ?? "").trim();
  const answersJson = String(formData.get("answers") ?? "{}");

  const student = await prisma.student.findFirst({ where: { userId: user.id } });
  if (!student) return { error: "Aluno não encontrado." };

  const match = await prisma.duelMatch.findUnique({
    where: { id: matchId },
    include: {
      challenger: { include: { user: true } },
      challenged: { include: { user: true } },
    },
  });

  if (!match || match.schoolId !== user.schoolId) return { error: "Duelo não encontrado." };
  if (match.status !== "active") return { error: "Este duelo não está ativo." };

  const isChallenger = match.challengerId === student.id;
  const isChallenged = match.challengedId === student.id;
  if (!isChallenger && !isChallenged) return { error: "Acesso negado." };

  const questions: DuelQuestion[] = JSON.parse(match.questionsJson || "[]");
  const parsedAnswers: Record<string, string> = JSON.parse(answersJson);

  let score = 0;
  for (const q of questions) {
    if (parsedAnswers[q.id] === q.correctOptionId) score += 1;
  }

  const alreadyField = isChallenger ? match.challengerAnswersJson : match.challengedAnswersJson;
  if (answersSubmitted(alreadyField)) {
    return { error: "Você já enviou suas respostas neste duelo." };
  }

  const submitted = isChallenger
    ? await prisma.duelMatch.updateMany({
        where: { id: matchId, status: "active", challengerAnswersJson: "[]" },
        data: { challengerAnswersJson: answersJson, challengerScore: score },
      })
    : await prisma.duelMatch.updateMany({
        where: { id: matchId, status: "active", challengedAnswersJson: "[]" },
        data: { challengedAnswersJson: answersJson, challengedScore: score },
      });

  if (submitted.count === 0) {
    return { error: "Respostas já registradas ou duelo encerrado." };
  }

  const updated = await prisma.duelMatch.findUnique({ where: { id: matchId } });
  if (!updated) return { error: "Duelo não encontrado." };

  const bothAnswered =
    answersSubmitted(updated.challengerAnswersJson) &&
    answersSubmitted(updated.challengedAnswersJson);

  if (!bothAnswered) {
    revalidatePath("/dashboard/aluno");
    return { success: true, completed: false, myScore: score };
  }

  let winnerId: string | null = null;
  if (updated.challengerScore > updated.challengedScore) winnerId = match.challengerId;
  else if (updated.challengedScore > updated.challengerScore) winnerId = match.challengedId;

  const finalized = await prisma.$transaction(async (tx) => {
    const claimed = await tx.duelMatch.updateMany({
      where: { id: matchId, status: "active" },
      data: {
        status: "completed",
        winnerId,
        completedAt: new Date(),
      },
    });
    if (claimed.count === 0) return false;

    const settings = await getSchoolSettingsForStudent(match.challengerId);

    if (winnerId) {
      const prizeCoins = match.betCoins * 2;
      const prizeXp = match.betXp * 2;

      if (prizeCoins > 0) {
        await tx.student.update({
          where: { id: winnerId },
          data: { coins: { increment: prizeCoins } },
        });
      }
      if (prizeXp > 0) {
        const winner = await tx.student.update({
          where: { id: winnerId },
          data: { xpTotal: { increment: prizeXp } },
        });
        await tx.xpTransaction.create({
          data: {
            studentId: winnerId,
            amount: prizeXp,
            source: "duel_win",
            reason: `Vitória no Duelo 1v1 (${updated.challengerScore} x ${updated.challengedScore})`,
          },
        });
        await tx.student.update({
          where: { id: winnerId },
          data: {
            level: calculateLevel(winner.xpTotal, settings.xp.xpPerLevel),
          },
        });
      }

      const loser = winnerId === match.challengerId ? match.challenged : match.challenger;

      await tx.studentActivity.create({
        data: {
          studentId: winnerId,
          type: "duel_win",
          title: "🏆 Vitória no Duelo 1v1!",
          detail: `Venceu ${loser.user.fullName} (${updated.challengerScore} x ${updated.challengedScore}) e conquistou +${match.betCoins * 2} moedas e +${match.betXp * 2} XP!`,
        },
      });
    } else if (match.betCoins > 0 || match.betXp > 0) {
      await tx.student.update({
        where: { id: match.challengerId },
        data: {
          coins: match.betCoins > 0 ? { increment: match.betCoins } : undefined,
          xpTotal: match.betXp > 0 ? { increment: match.betXp } : undefined,
        },
      });
      await tx.student.update({
        where: { id: match.challengedId },
        data: {
          coins: match.betCoins > 0 ? { increment: match.betCoins } : undefined,
          xpTotal: match.betXp > 0 ? { increment: match.betXp } : undefined,
        },
      });
    }

    return true;
  });

  if (finalized && winnerId) {
    const loserId = winnerId === match.challengerId ? match.challengedId : match.challengerId;
    await notifyStudent(
      loserId,
      "Duelo encerrado",
      `Você perdeu o duelo (${updated.challengerScore} x ${updated.challengedScore}).`,
      "/dashboard/aluno"
    );
  }

  revalidatePath("/dashboard/aluno");
  return {
    success: true,
    completed: finalized,
    winnerId,
    myScore: score,
  };
}
