import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { teacherClassWhere } from "@/lib/teacher-classes";

export async function getDashboardStats(schoolId: string | null) {
  if (!schoolId) {
    return {
      totalStudents: 0,
      totalClasses: 0,
      averageGrade: 0,
      attendanceRate: 0,
      activeMissions: 0,
      totalXpAwarded: 0,
    };
  }

  const [students, classes, grades, attendance, activeMissions, xpSum] = await Promise.all([
    prisma.student.count({
      where: { user: { schoolId } },
    }),
    prisma.classGroup.count({ where: { schoolId } }),
    prisma.grade.findMany({
      where: { student: { user: { schoolId } } },
      select: { value: true },
    }),
    prisma.attendance.findMany({
      where: { student: { user: { schoolId } } },
      select: { status: true },
    }),
    prisma.mission.count({ where: { schoolId, isActive: true } }),
    prisma.student.aggregate({
      where: { user: { schoolId } },
      _sum: { xpTotal: true },
    }),
  ]);

  const averageGrade =
    grades.length > 0 ? grades.reduce((s, g) => s + g.value, 0) / grades.length : 0;

  const presentCount = attendance.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;
  const attendanceRate = attendance.length > 0 ? (presentCount / attendance.length) * 100 : 0;

  return {
    totalStudents: students,
    totalClasses: classes,
    averageGrade,
    attendanceRate,
    activeMissions,
    totalXpAwarded: xpSum._sum.xpTotal ?? 0,
  };
}

export async function getRanking(schoolId: string | null, classId?: string | null) {
  if (!schoolId) return [];

  const students = await prisma.student.findMany({
    where: {
      user: { schoolId },
      ...(classId ? { classId } : {}),
    },
    include: {
      user: { select: { fullName: true, avatarUrl: true } },
      classGroup: { select: { name: true } },
    },
    orderBy: { xpTotal: "desc" },
    take: classId ? 50 : 20,
  });

  return students.map((s, i) => ({
    rank: i + 1,
    id: s.id,
    name: s.user.fullName,
    avatarUrl: s.user.avatarUrl,
    xp: s.xpTotal,
    level: s.level,
    coins: s.coins,
    className: s.classGroup?.name ?? "-",
  }));
}

export async function getMonthlyPerformance(schoolId: string | null) {
  if (!schoolId) return [];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

  const [grades, xp, attendance] = await Promise.all([
    prisma.grade.findMany({
      where: {
        student: { user: { schoolId } },
        createdAt: { gte: sixMonthsAgo },
      },
      select: { value: true, createdAt: true },
    }),
    prisma.xpTransaction.findMany({
      where: {
        student: { user: { schoolId } },
        createdAt: { gte: sixMonthsAgo },
      },
      select: { amount: true, createdAt: true },
    }),
    prisma.attendance.findMany({
      where: {
        student: { user: { schoolId } },
        date: { gte: sixMonthsAgo },
      },
      select: { status: true, date: true },
    }),
  ]);

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const result: Record<string, { nota: number; xp: number; frequencia: number; notaCount: number; freqCount: number }> = {};

  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const key = months[d.getMonth()];
    result[key] = { nota: 0, xp: 0, frequencia: 0, notaCount: 0, freqCount: 0 };
  }

  grades.forEach((g) => {
    const key = months[g.createdAt.getMonth()];
    if (result[key]) {
      result[key].nota += g.value;
      result[key].notaCount++;
    }
  });

  xp.forEach((x) => {
    const key = months[x.createdAt.getMonth()];
    if (result[key]) result[key].xp += x.amount;
  });

  attendance.forEach((a) => {
    const key = months[a.date.getMonth()];
    if (result[key]) {
      result[key].freqCount++;
      if (a.status === "present" || a.status === "late") result[key].frequencia++;
    }
  });

  return Object.entries(result).map(([month, data]) => ({
    month,
    nota: data.notaCount ? Math.round((data.nota / data.notaCount) * 10) / 10 : 0,
    xp: data.xp,
    frequencia: data.freqCount ? Math.round((data.frequencia / data.freqCount) * 100) : 0,
  }));
}

export async function getClassComparison(schoolId: string | null) {
  if (!schoolId) return [];

  const classes = await prisma.classGroup.findMany({
    where: { schoolId },
    include: {
      students: {
        include: {
          grades: { select: { value: true } },
        },
      },
    },
  });

  return classes.map((c) => {
    const allGrades = c.students.flatMap((s) => s.grades);
    const media =
      allGrades.length > 0
        ? allGrades.reduce((sum, g) => sum + g.value, 0) / allGrades.length
        : 0;
    const avgXp =
      c.students.length > 0
        ? c.students.reduce((s, st) => s + st.xpTotal, 0) / c.students.length
        : 0;
    const engajamento = Math.min(100, Math.round((avgXp / 3000) * 100));
    return { turma: c.name, media: Math.round(media * 10), engajamento };
  });
}

export async function getStudents(schoolId: string | null) {
  if (!schoolId) return [];
  return prisma.student.findMany({
    where: { user: { schoolId } },
    include: {
      user: { select: { fullName: true, email: true, avatarUrl: true } },
      classGroup: { select: { id: true, name: true } },
      grades: { select: { value: true } },
    },
    orderBy: { user: { fullName: "asc" } },
  });
}

export async function getStudentById(id: string, schoolId: string | null) {
  if (!schoolId) return null;
  return prisma.student.findFirst({
    where: { id, user: { schoolId } },
    include: {
      user: true,
      classGroup: true,
      grades: { orderBy: { createdAt: "desc" } },
      attendance: { orderBy: { date: "desc" }, take: 30 },
      xpTransactions: { orderBy: { createdAt: "desc" }, take: 20 },
      studentMissions: { include: { mission: true } },
      studentBadges: { include: { badge: true } },
    },
  });
}

export async function getClasses(schoolId: string | null, teacherId?: string) {
  if (!schoolId) return [];
  return prisma.classGroup.findMany({
    where: {
      schoolId,
      ...(teacherId ? teacherClassWhere(teacherId) : {}),
    },
    include: {
      teacher: { select: { id: true, fullName: true, avatarUrl: true } },
      coTeachers: {
        include: { teacher: { select: { id: true, fullName: true, avatarUrl: true } } },
      },
      students: { include: { user: { select: { fullName: true, avatarUrl: true } } } },
      _count: { select: { students: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getGrades(schoolId: string | null) {
  if (!schoolId) return [];
  return prisma.grade.findMany({
    where: { student: { user: { schoolId } } },
    include: {
      student: { include: { user: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAttendance(schoolId: string | null, date?: Date) {
  if (!schoolId) return [];
  const targetDate = date ?? new Date();
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  return prisma.attendance.findMany({
    where: {
      student: { user: { schoolId } },
      date: { gte: targetDate, lt: nextDay },
    },
    include: {
      student: { include: { user: { select: { fullName: true } } } },
      classGroup: { select: { name: true } },
      justifiedBy: { select: { fullName: true } },
    },
    orderBy: { student: { user: { fullName: "asc" } } },
  });
}

export async function getMissions(schoolId: string | null) {
  if (!schoolId) return [];
  return prisma.mission.findMany({
    where: { schoolId },
    include: {
      classGroup: { select: { name: true } },
      studentMissions: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMissionsForStudent(schoolId: string | null, classId: string | null) {
  if (!schoolId) return [];
  return prisma.mission.findMany({
    where: {
      schoolId,
      isActive: true,
      OR: [{ classId: null }, ...(classId ? [{ classId }] : [])],
    },
    include: {
      classGroup: { select: { name: true } },
      studentMissions: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBadges(schoolId: string | null) {
  if (!schoolId) return [];
  return prisma.badge.findMany({
    where: { schoolId },
    include: { _count: { select: { studentBadges: true } } },
  });
}

export async function getRecentXp(schoolId: string | null, limit = 10) {
  if (!schoolId) return [];
  return prisma.xpTransaction.findMany({
    where: { student: { user: { schoolId } } },
    include: { student: { include: { user: { select: { fullName: true } } } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getTeachers(schoolId: string | null) {
  if (!schoolId) return [];
  return prisma.user.findMany({
    where: { schoolId, role: "teacher" },
    select: { id: true, fullName: true, email: true, avatarUrl: true, city: true, state: true },
  });
}

export async function getSchool(user: SessionUser) {
  if (!user.schoolId) return null;
  return prisma.school.findUnique({ where: { id: user.schoolId } });
}
