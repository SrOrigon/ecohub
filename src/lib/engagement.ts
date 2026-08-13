import { prisma } from "@/lib/db";
import { teacherClassWhere } from "@/lib/teacher-classes";

export async function getEngagementOverview(schoolId: string | null, teacherId?: string) {
  if (!schoolId) {
    return emptyOverview();
  }

  const classFilter = teacherId ? { schoolId, ...teacherClassWhere(teacherId) } : { schoolId };
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const classes = await prisma.classGroup.findMany({
    where: classFilter,
    select: {
      id: true,
      name: true,
      students: {
        select: {
          id: true,
          xpTotal: true,
          studentMissions: {
            where: { mission: { isActive: true } },
            select: { completedAt: true },
          },
          _count: {
            select: { exerciseSubmissions: true },
          },
          exerciseSubmissions: {
            where: {
              OR: [{ status: { not: "submitted" } }, { gradedAt: { not: null } }],
            },
            select: { id: true },
          },
          attendance: {
            where: { date: { gte: ninetyDaysAgo } },
            select: { status: true },
          },
        },
      },
    },
  });

  const activeMissions = await prisma.mission.count({
    where: { schoolId, isActive: true },
  });

  const pendingSubmissions = await prisma.exerciseSubmission.count({
    where: {
      status: "submitted",
      exercise: teacherId ? { teacherId, schoolId } : { schoolId },
    },
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const xpThisWeek = await prisma.xpTransaction.aggregate({
    where: {
      createdAt: { gte: weekAgo },
      student: { user: { schoolId } },
    },
    _sum: { amount: true },
  });

  const classStats: ClassEngagement[] = classes.map((c) => {
    const students = c.students;
    const count = students.length || 1;

    let missionTotal = 0;
    let missionDone = 0;
    let exerciseTotal = 0;
    let exerciseDone = 0;
    let attendanceTotal = 0;
    let attendancePresent = 0;
    let xpSum = 0;

    for (const s of students) {
      xpSum += s.xpTotal;
      missionTotal += s.studentMissions.length;
      missionDone += s.studentMissions.filter((m) => m.completedAt).length;

      exerciseDone += s.exerciseSubmissions.length;
      exerciseTotal += s._count.exerciseSubmissions + 2;

      attendanceTotal += s.attendance.length || 1;
      attendancePresent += s.attendance.filter((a) => a.status === "present" || a.status === "late").length;
    }

    const missionRate = missionTotal > 0 ? Math.round((missionDone / missionTotal) * 100) : 0;
    const exerciseRate = exerciseTotal > 0 ? Math.round((exerciseDone / exerciseTotal) * 100) : 0;
    const attendanceRate = attendanceTotal > 0 ? Math.round((attendancePresent / attendanceTotal) * 100) : 0;
    const avgXp = Math.round(xpSum / count);
    const engagementScore = Math.round((missionRate + exerciseRate + attendanceRate) / 3);

    return {
      classId: c.id,
      className: c.name,
      studentCount: students.length,
      missionRate,
      exerciseRate,
      attendanceRate,
      avgXp,
      engagementScore,
    };
  });

  const topStudents = await prisma.student.findMany({
    where: { user: { schoolId } },
    include: { user: { select: { fullName: true } } },
    orderBy: { xpTotal: "desc" },
    take: 10,
  });

  const totalStudents = classStats.reduce((s, c) => s + c.studentCount, 0);
  const avg = (key: keyof ClassEngagement) =>
    classStats.length > 0
      ? Math.round(classStats.reduce((s, c) => s + (c[key] as number), 0) / classStats.length)
      : 0;

  return {
    totalStudents,
    activeMissions,
    pendingSubmissions,
    avgMissionRate: avg("missionRate"),
    avgExerciseRate: avg("exerciseRate"),
    avgAttendanceRate: avg("attendanceRate"),
    xpThisWeek: xpThisWeek._sum.amount ?? 0,
    classes: classStats.sort((a, b) => b.engagementScore - a.engagementScore),
    topStudents: topStudents.map((s) => ({
      id: s.id,
      name: s.user.fullName,
      xp: s.xpTotal,
      level: s.level,
    })),
  } satisfies EngagementOverview;
}

export type ClassEngagement = {
  classId: string;
  className: string;
  studentCount: number;
  missionRate: number;
  exerciseRate: number;
  attendanceRate: number;
  avgXp: number;
  engagementScore: number;
};

export type EngagementOverview = {
  totalStudents: number;
  activeMissions: number;
  pendingSubmissions: number;
  avgMissionRate: number;
  avgExerciseRate: number;
  avgAttendanceRate: number;
  xpThisWeek: number;
  classes: ClassEngagement[];
  topStudents: { id: string; name: string; xp: number; level: number }[];
};

function emptyOverview(): EngagementOverview {
  return {
    totalStudents: 0,
    activeMissions: 0,
    pendingSubmissions: 0,
    avgMissionRate: 0,
    avgExerciseRate: 0,
    avgAttendanceRate: 0,
    xpThisWeek: 0,
    classes: [],
    topStudents: [],
  };
}
