import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { studentInTeacherClassWhere } from "@/lib/teacher-classes";

export type ActivityEventType = "xp" | "exercise" | "mission" | "grade";

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  studentName: string;
  studentId: string;
  label: string;
  detail?: string;
  amount?: number;
  createdAt: string;
};

export type LiveStats = {
  xpThisWeek: number;
  totalXpAwarded: number;
  pendingGrading: number;
  pendingMissionConfirmations: number;
  activeMissions: number;
  exerciseSubmissionsToday: number;
  totalStudents: number;
  averageGrade: number;
  attendanceRate: number;
};

export type LiveStudentStats = {
  xpTotal: number;
  level: number;
  coins: number;
  xpThisWeek: number;
  classRank: number | null;
  schoolRank: number | null;
};

export type LiveMetricsSnapshot = {
  version: string;
  updatedAt: string;
  stats: LiveStats;
  activities: ActivityEvent[];
  student?: LiveStudentStats;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

function buildVersion(stats: LiveStats, activityIds: string[]) {
  return [
    stats.xpThisWeek,
    stats.pendingGrading,
    stats.pendingMissionConfirmations,
    stats.exerciseSubmissionsToday,
    activityIds.slice(0, 3).join("-"),
  ].join("|");
}

async function getStudentRanks(schoolId: string, studentId: string, classId: string | null) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { xpTotal: true },
  });
  if (!student) return { schoolRank: null, classRank: null };

  const [higherInSchool, higherInClass] = await Promise.all([
    prisma.student.count({
      where: { user: { schoolId }, xpTotal: { gt: student.xpTotal } },
    }),
    classId
      ? prisma.student.count({
          where: { user: { schoolId }, classId, xpTotal: { gt: student.xpTotal } },
        })
      : Promise.resolve(-1),
  ]);

  return {
    schoolRank: higherInSchool + 1,
    classRank: classId && higherInClass >= 0 ? higherInClass + 1 : null,
  };
}

export async function getLiveMetricsSnapshot(user: SessionUser): Promise<LiveMetricsSnapshot> {
  const schoolId = user.schoolId;
  const empty: LiveMetricsSnapshot = {
    version: "0",
    updatedAt: new Date().toISOString(),
    stats: {
      xpThisWeek: 0,
      totalXpAwarded: 0,
      pendingGrading: 0,
      pendingMissionConfirmations: 0,
      activeMissions: 0,
      exerciseSubmissionsToday: 0,
      totalStudents: 0,
      averageGrade: 0,
      attendanceRate: 0,
    },
    activities: [],
  };

  if (!schoolId) return empty;

  try {
    const today = startOfToday();
    const week = weekAgo();
    const isTeacher = user.role === "teacher";
    const teacherStudentFilter = isTeacher ? studentInTeacherClassWhere(user.id) : undefined;

    const exerciseWhere = isTeacher
      ? { schoolId, teacherId: user.id }
      : { schoolId };

    const pendingExerciseWhere = isTeacher
      ? { status: "submitted" as const, exercise: { teacherId: user.id, schoolId } }
      : { status: "submitted" as const, exercise: { schoolId } };

    const [
      xpWeekAgg,
      xpTotalAgg,
      pendingGrading,
      pendingMissions,
      activeMissions,
      submissionsToday,
      studentCount,
      gradeAgg,
      attendanceGroups,
      recentXp,
      recentSubmissions,
      recentMissions,
      recentGrades,
      studentRecord,
    ] = await Promise.all([
      prisma.xpTransaction.aggregate({
        where: {
          createdAt: { gte: week },
          student: { user: { schoolId }, ...(teacherStudentFilter ?? {}) },
        },
        _sum: { amount: true },
      }),
      prisma.student.aggregate({
        where: { user: { schoolId }, ...(teacherStudentFilter ?? {}) },
        _sum: { xpTotal: true },
      }),
      prisma.exerciseSubmission.count({ where: pendingExerciseWhere }),
      prisma.studentMission.count({
        where: {
          completedAt: null,
          student: { user: { schoolId }, ...(teacherStudentFilter ?? {}) },
          mission: { schoolId, isActive: true },
        },
      }),
      prisma.mission.count({ where: { schoolId, isActive: true } }),
      prisma.exerciseSubmission.count({
        where: {
          submittedAt: { gte: today },
          exercise: exerciseWhere,
        },
      }),
      prisma.student.count({
        where: { user: { schoolId }, ...(teacherStudentFilter ?? {}) },
      }),
      prisma.grade.aggregate({
        where: { student: { user: { schoolId }, ...(teacherStudentFilter ?? {}) } },
        _avg: { value: true },
      }),
      prisma.attendance.groupBy({
        by: ["status"],
        where: { student: { user: { schoolId }, ...(teacherStudentFilter ?? {}) } },
        _count: true,
      }),
      prisma.xpTransaction.findMany({
        where: { student: { user: { schoolId }, ...(teacherStudentFilter ?? {}) } },
        include: {
          student: { include: { user: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.exerciseSubmission.findMany({
        where: { exercise: exerciseWhere },
        include: {
          student: { include: { user: { select: { fullName: true } } } },
          exercise: { select: { title: true } },
        },
        orderBy: { submittedAt: "desc" },
        take: 6,
      }),
      prisma.studentMission.findMany({
        where: {
          completedAt: { not: null },
          student: { user: { schoolId }, ...(teacherStudentFilter ?? {}) },
        },
        include: {
          student: { include: { user: { select: { fullName: true } } } },
          mission: { select: { title: true, xpReward: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 6,
      }),
      prisma.grade.findMany({
        where: { student: { user: { schoolId }, ...(teacherStudentFilter ?? {}) } },
        include: {
          student: { include: { user: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      user.role === "student"
        ? prisma.student.findFirst({
            where: { userId: user.id },
            select: { id: true, classId: true, xpTotal: true, level: true, coins: true },
          })
        : Promise.resolve(null),
    ]);

    const totalAttendance = attendanceGroups.reduce((sum, group) => sum + group._count, 0);
    const present = attendanceGroups
      .filter((group) => group.status === "present" || group.status === "late")
      .reduce((sum, group) => sum + group._count, 0);
    const attendanceRate =
      totalAttendance > 0 ? Math.round((present / totalAttendance) * 100) : 0;

    const stats: LiveStats = {
      xpThisWeek: xpWeekAgg._sum.amount ?? 0,
      totalXpAwarded: xpTotalAgg._sum.xpTotal ?? 0,
      pendingGrading,
      pendingMissionConfirmations: pendingMissions,
      activeMissions,
      exerciseSubmissionsToday: submissionsToday,
      totalStudents: studentCount,
      averageGrade: Math.round((gradeAgg._avg.value ?? 0) * 10) / 10,
      attendanceRate,
    };

    const activities: ActivityEvent[] = [
      ...recentXp.map((tx) => ({
        id: `xp-${tx.id}`,
        type: "xp" as const,
        studentName: tx.student?.user?.fullName ?? "Aluno",
        studentId: tx.studentId,
        label: tx.reason,
        amount: tx.amount,
        createdAt: tx.createdAt.toISOString(),
      })),
      ...recentSubmissions.map((sub) => ({
        id: `ex-${sub.id}`,
        type: "exercise" as const,
        studentName: sub.student?.user?.fullName ?? "Aluno",
        studentId: sub.studentId,
        label: sub.exercise?.title ?? "Exercício",
        detail: sub.status === "submitted" ? "Entrega aguardando correção" : "Exercício entregue",
        createdAt: sub.submittedAt.toISOString(),
      })),
      ...recentMissions.map((sm) => ({
        id: `ms-${sm.id}`,
        type: "mission" as const,
        studentName: sm.student?.user?.fullName ?? "Aluno",
        studentId: sm.studentId,
        label: sm.mission?.title ?? "Missão",
        amount: sm.mission?.xpReward ?? 0,
        detail: "Missão concluída",
        createdAt: (sm.completedAt ?? sm.createdAt).toISOString(),
      })),
      ...recentGrades.map((g) => ({
        id: `gr-${g.id}`,
        type: "grade" as const,
        studentName: g.student?.user?.fullName ?? "Aluno",
        studentId: g.studentId,
        label: g.subject,
        detail: `Nota ${(g.value ?? 0).toFixed(1)}`,
        createdAt: g.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15);

    let student: LiveStudentStats | undefined;
    if (studentRecord) {
      const [ranks, studentXpWeek] = await Promise.all([
        getStudentRanks(schoolId, studentRecord.id, studentRecord.classId),
        prisma.xpTransaction.aggregate({
          where: { studentId: studentRecord.id, createdAt: { gte: week } },
          _sum: { amount: true },
        }),
      ]);
      student = {
        xpTotal: studentRecord.xpTotal,
        level: studentRecord.level,
        coins: studentRecord.coins,
        xpThisWeek: studentXpWeek._sum.amount ?? 0,
        classRank: ranks.classRank,
        schoolRank: ranks.schoolRank,
      };
    }

    // Alunos e responsáveis não podem ver estatísticas institucionais nem o
    // feed com nomes e notas de outros alunos.
    const isStaff = user.role !== "student" && user.role !== "parent";
    const visibleStats = isStaff ? stats : empty.stats;
    const visibleActivities = isStaff
      ? activities
      : activities.filter((a) => a.studentId === studentRecord?.id);

    return {
      version: buildVersion(
        visibleStats,
        visibleActivities.map((a) => a.id)
      ),
      updatedAt: new Date().toISOString(),
      stats: visibleStats,
      activities: visibleActivities,
      student,
    };
  } catch (err) {
    console.error("[getLiveMetricsSnapshot] Error:", err);
    return empty;
  }
}
