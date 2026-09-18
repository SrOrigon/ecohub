import { prisma } from "@/lib/db";
import type { XpSource } from "@/lib/constants";
import { studentsInClassWhere } from "@/lib/student-enrollments";
import {
  DEFAULT_SCHOOL_SETTINGS,
  getSchoolSettingsForStudent,
  type SchoolSettings,
} from "@/lib/school-settings";

export function calculateLevel(xpTotal: number, xpPerLevel = DEFAULT_SCHOOL_SETTINGS.xp.xpPerLevel) {
  const step = Math.max(1, xpPerLevel);
  return Math.max(1, Math.floor(xpTotal / step) + 1);
}

export function getXpProgress(xpTotal: number, xpPerLevel = DEFAULT_SCHOOL_SETTINGS.xp.xpPerLevel) {
  const step = Math.max(1, xpPerLevel);
  const xpInLevel = xpTotal % step;
  const percent = Math.round((xpInLevel / step) * 100);
  const level = calculateLevel(xpTotal, step);
  const xpForNextLevel = level * step;
  return { percent, xpInLevel, xpForNextLevel, level };
}

export async function awardXp(
  studentId: string,
  amount: number,
  reason: string,
  source: XpSource,
  coins = 0,
  settings?: SchoolSettings
) {
  if (amount <= 0 && coins <= 0) return;

  const rules = settings ?? (await getSchoolSettingsForStudent(studentId));
  const xpPerLevel = rules.xp.xpPerLevel;

  await prisma.$transaction(async (tx) => {
    if (amount > 0) {
      await tx.xpTransaction.create({
        data: { studentId, amount, reason, source },
      });
    }

    const student = await tx.student.update({
      where: { id: studentId },
      data: {
        xpTotal: amount > 0 ? { increment: amount } : undefined,
        coins: coins > 0 ? { increment: coins } : undefined,
      },
    });

    const newLevel = calculateLevel(student.xpTotal, xpPerLevel);
    if (newLevel !== student.level) {
      await tx.student.update({
        where: { id: studentId },
        data: { level: newLevel },
      });
    }

    if (amount > 0) {
      await checkAndAwardBadges(tx, studentId, student.xpTotal, rules);
    }
  });
}

/** Ajuste manual de XP/moedas (ganho ou perda) — atividades em sala, diretoria, etc. */
export async function adjustStudentPoints(
  studentId: string,
  xpDelta: number,
  coinDelta: number,
  reason: string,
  source: XpSource = "manual",
  settings?: SchoolSettings
) {
  if (xpDelta === 0 && coinDelta === 0) {
    throw new Error("Informe XP ou moedas para ajustar.");
  }
  if (!reason.trim()) {
    throw new Error("Descreva a atividade ou motivo do ajuste.");
  }

  const rules = settings ?? (await getSchoolSettingsForStudent(studentId));
  const xpPerLevel = rules.xp.xpPerLevel;

  const coinNote =
    coinDelta !== 0 ? ` (${coinDelta > 0 ? "+" : ""}${coinDelta} moedas)` : "";
  const fullReason = `${reason.trim()}${coinNote}`;

  return prisma.$transaction(async (tx) => {
    const current = await tx.student.findUnique({
      where: { id: studentId },
      select: { xpTotal: true, coins: true },
    });
    if (!current) throw new Error("Aluno não encontrado.");

    const nextXp = current.xpTotal + xpDelta;
    const nextCoins = current.coins + coinDelta;
    if (nextXp < 0) throw new Error("O aluno não tem XP suficiente para esta dedução.");
    if (nextCoins < 0) throw new Error("O aluno não tem moedas suficientes para esta dedução.");

    await tx.xpTransaction.create({
      data: {
        studentId,
        amount: xpDelta,
        reason: fullReason,
        source,
      },
    });

    const student = await tx.student.update({
      where: { id: studentId },
      data: {
        ...(xpDelta !== 0 ? { xpTotal: nextXp, level: calculateLevel(nextXp, xpPerLevel) } : {}),
        ...(coinDelta !== 0 ? { coins: nextCoins } : {}),
      },
    });

    if (xpDelta > 0) {
      await checkAndAwardBadges(tx, studentId, student.xpTotal, rules);
    }

    return student;
  });
}

async function checkAndAwardBadges(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  studentId: string,
  xpTotal: number,
  settings: SchoolSettings
) {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    include: { user: true, studentBadges: true, grades: true, studentMissions: true },
  });
  if (!student?.user.schoolId) return;

  const badges = await tx.badge.findMany({
    where: { schoolId: student.user.schoolId, classId: null },
  });
  const earnedIds = new Set(student.studentBadges.map((b) => b.badgeId));

  const avgGrade =
    student.grades.length > 0
      ? student.grades.reduce((s, g) => s + g.value, 0) / student.grades.length
      : 0;
  const completedMissions = student.studentMissions.filter((m) => m.completedAt).length;
  const badgeXp = settings.xp.badgeUnlock;
  const excellent = settings.academic.passGrade + 2;

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue;

    let earned = false;
    if (badge.icon === "star" && avgGrade >= excellent) earned = true;
    if (badge.icon === "target" && completedMissions >= 5) earned = true;
    if (badge.icon === "clock" && xpTotal >= badge.xpRequired) earned = true;
    if (xpTotal >= badge.xpRequired && badge.icon !== "star" && badge.icon !== "target")
      earned = true;

    if (earned) {
      await tx.studentBadge.create({ data: { studentId, badgeId: badge.id } });
      if (badgeXp > 0) {
        await tx.xpTransaction.create({
          data: {
            studentId,
            amount: badgeXp,
            reason: `Conquista desbloqueada: ${badge.name}`,
            source: "badge",
          },
        });
        const updated = await tx.student.update({
          where: { id: studentId },
          data: { xpTotal: { increment: badgeXp } },
        });
        const newLevel = calculateLevel(updated.xpTotal, settings.xp.xpPerLevel);
        if (newLevel !== updated.level) {
          await tx.student.update({
            where: { id: studentId },
            data: { level: newLevel },
          });
        }
      }
    }
  }
}

export async function processGradeXp(studentId: string, value: number, subject: string) {
  const settings = await getSchoolSettingsForStudent(studentId);
  const baseXp = Math.round(value * settings.xp.perGradePoint);
  let bonus = 0;
  if (value >= settings.xp.gradeBonusThreshold) bonus = settings.xp.gradeBonus;

  await awardXp(
    studentId,
    baseXp + bonus,
    bonus > 0 ? `Nota ${value} em ${subject} (+ bônus)` : `Nota ${value} em ${subject}`,
    "grade",
    0,
    settings
  );
}

export function attendanceXpForStatus(status: string, settings: SchoolSettings) {
  if (status === "present") return settings.xp.attendancePresent;
  if (status === "late") return settings.xp.attendanceLate;
  return 0;
}

export async function processAttendanceXp(
  studentId: string,
  status: string,
  previousStatus?: string | null
) {
  const settings = await getSchoolSettingsForStudent(studentId);
  const nextXp = attendanceXpForStatus(status, settings);
  const prevXp = previousStatus ? attendanceXpForStatus(previousStatus, settings) : 0;
  const delta = nextXp - prevXp;

  if (delta > 0) {
    await awardXp(
      studentId,
      delta,
      status === "present" ? "Presença registrada" : "Presença com atraso",
      "attendance",
      0,
      settings
    );
  }

  await maybeAwardPerfectAttendance(studentId, settings);
}

export async function maybeAwardPerfectAttendance(
  studentId: string,
  settings?: Awaited<ReturnType<typeof getSchoolSettingsForStudent>>
) {
  const rules = settings ?? (await getSchoolSettingsForStudent(studentId));
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const reason = `Frequência 100% em ${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

  await prisma.$transaction(async (tx) => {
    const already = await tx.xpTransaction.findFirst({
      where: { studentId, reason },
      select: { id: true },
    });
    if (already) return;

    const records = await tx.attendance.findMany({
      where: { studentId, date: { gte: start, lte: end } },
      select: { status: true },
    });
    if (records.length < rules.finance.minSchoolDaysForPerfectMonth) return;
    if (records.some((record) => record.status === "absent")) return;

    const student = await tx.student.findUnique({
      where: { id: studentId },
      select: { xpTotal: true, coins: true },
    });
    if (!student) return;

    await tx.xpTransaction.create({
      data: {
        studentId,
        amount: rules.finance.perfectAttendanceXp,
        reason,
        source: "attendance",
      },
    });

    await tx.student.update({
      where: { id: studentId },
      data: {
        xpTotal: { increment: rules.finance.perfectAttendanceXp },
        coins: { increment: rules.finance.perfectAttendanceCoins },
        level: calculateLevel(
          student.xpTotal + rules.finance.perfectAttendanceXp,
          rules.xp.xpPerLevel
        ),
      },
    });
  });
}

export async function awardClassAttitude(
  studentId: string,
  badgeId: string,
  schoolId: string
) {
  const badge = await prisma.badge.findFirst({
    where: { id: badgeId, schoolId },
    include: { classes: true },
  });
  if (!badge) throw new Error("Atitude não encontrada.");

  const linkedClassIds = [
    ...(badge.classId ? [badge.classId] : []),
    ...(badge.classes ? badge.classes.map((bc) => bc.classId) : []),
  ];

  if (linkedClassIds.length > 0) {
    const enrolled = await prisma.student.findFirst({
      where: {
        id: studentId,
        OR: linkedClassIds.map((cid) => studentsInClassWhere(cid)),
      },
      select: { id: true },
    });
    if (!enrolled) throw new Error("Esta atitude só pode ser aplicada a alunos das turmas vinculadas.");
  }

  try {
    await prisma.studentBadge.create({
      data: { studentId, badgeId },
    });
  } catch {
    throw new Error("Este aluno já recebeu esta atitude.");
  }

  if (badge.xpRequired > 0) {
    await awardXp(studentId, badge.xpRequired, `Atitude: ${badge.name}`, "badge");
  }

  return badge;
}

export async function completeMission(studentId: string, missionId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { user: { select: { schoolId: true } } },
  });
  if (!student?.user.schoolId) throw new Error("Aluno não encontrado");

  // Missão e aluno precisam pertencer à mesma instituição.
  const mission = await prisma.mission.findFirst({
    where: { id: missionId, schoolId: student.user.schoolId },
  });
  if (!mission) throw new Error("Missão não encontrada");

  const existing = await prisma.studentMission.findUnique({
    where: { studentId_missionId: { studentId, missionId } },
  });
  if (existing?.completedAt) throw new Error("Missão já concluída");

  if (existing) {
    // updateMany condicional garante que só uma requisição concorrente credita XP.
    const claimed = await prisma.studentMission.updateMany({
      where: { studentId, missionId, completedAt: null },
      data: { completedAt: new Date() },
    });
    if (claimed.count === 0) throw new Error("Missão já concluída");
  } else {
    try {
      await prisma.studentMission.create({
        data: { studentId, missionId, completedAt: new Date() },
      });
    } catch {
      throw new Error("Missão já concluída");
    }
  }

  await awardXp(
    studentId,
    mission.xpReward,
    `Missão: ${mission.title}`,
    "mission",
    mission.coinReward
  );
}
