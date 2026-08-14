import { prisma } from "@/lib/db";
import { teacherClassWhere, studentInTeacherClassWhere } from "@/lib/teacher-classes";

export type StudentRankingMetric = "xp" | "xpWeek" | "grade" | "missions";
export type ClassRankingMetric = "engagement" | "xpWeek" | "grade" | "participation";

export type StudentRankEntry = {
  rank: number;
  id: string;
  name: string;
  displayName: string;
  avatarUrl: string | null;
  classId: string | null;
  className: string;
  score: number;
  scoreLabel: string;
  level: number;
  xpTotal: number;
  xpThisWeek: number;
  averageGrade: number;
  missionsDone: number;
  badgesCount: number;
};

export type ClassRankEntry = {
  rank: number;
  classId: string;
  className: string;
  gradeLevel: string | null;
  studentCount: number;
  engagementScore: number;
  avgGrade: number;
  avgXp: number;
  xpThisWeek: number;
  xpPerStudentWeek: number;
  missionRate: number;
  exerciseRate: number;
  attendanceRate: number;
  participationScore: number;
};

export type StudentPosition = {
  rank: number;
  total: number;
  entry: StudentRankEntry;
  metric: StudentRankingMetric;
  scope: "school" | "class";
};

export type RankingsOverview = {
  classRankings: ClassRankEntry[];
  schoolStudentRankings: Record<StudentRankingMetric, StudentRankEntry[]>;
  classStudentRankings: Record<string, Record<StudentRankingMetric, StudentRankEntry[]>>;
  classes: { id: string; name: string; studentCount: number }[];
  currentStudent?: {
    classId: string | null;
    positions: Partial<Record<StudentRankingMetric, { school: StudentPosition; class: StudentPosition }>>;
  };
  healthyCompetitionNote: string;
};

const METRIC_LABELS: Record<StudentRankingMetric, string> = {
  xp: "XP acumulado",
  xpWeek: "XP da semana",
  grade: "Média de notas",
  missions: "Missões concluídas",
};

const CLASS_METRIC_LABELS: Record<ClassRankingMetric, string> = {
  engagement: "Engajamento geral",
  xpWeek: "XP da turma (semana)",
  grade: "Média de notas",
  participation: "Participação coletiva",
};

export function getStudentMetricLabel(metric: StudentRankingMetric) {
  return METRIC_LABELS[metric];
}

export function getClassMetricLabel(metric: ClassRankingMetric) {
  return CLASS_METRIC_LABELS[metric];
}

export function anonymizePeerName(fullName: string, isSelf: boolean) {
  if (isSelf) return "Você";
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

type StudentRow = Omit<StudentRankEntry, "rank" | "displayName" | "score" | "scoreLabel">;

function rankStudents(
  rows: StudentRow[],
  metric: StudentRankingMetric,
  anonymize: boolean,
  currentStudentId?: string
): StudentRankEntry[] {
  const sorted = [...rows].sort((a, b) => {
    const av =
      metric === "xp"
        ? a.xpTotal
        : metric === "xpWeek"
          ? a.xpThisWeek
          : metric === "grade"
            ? a.averageGrade
            : a.missionsDone;
    const bv =
      metric === "xp"
        ? b.xpTotal
        : metric === "xpWeek"
          ? b.xpThisWeek
          : metric === "grade"
            ? b.averageGrade
            : b.missionsDone;
    return bv - av || b.xpTotal - a.xpTotal;
  });

  return sorted.map((row, i) => {
    const isSelf = row.id === currentStudentId;
    const score =
      metric === "xp"
        ? row.xpTotal
        : metric === "xpWeek"
          ? row.xpThisWeek
          : metric === "grade"
            ? row.averageGrade
            : row.missionsDone;
    const scoreLabel =
      metric === "grade" ? score.toFixed(1) : metric === "missions" ? String(score) : String(Math.round(score));

    return {
      ...row,
      rank: i + 1,
      score,
      scoreLabel,
      displayName: anonymize ? anonymizePeerName(row.name, isSelf) : row.name,
    };
  });
}

function findPosition(list: StudentRankEntry[], studentId: string, metric: StudentRankingMetric, scope: "school" | "class"): StudentPosition | undefined {
  const entry = list.find((r) => r.id === studentId);
  if (!entry) return undefined;
  return { rank: entry.rank, total: list.length, entry, metric, scope };
}

function buildClassRankings(
  classMap: Map<
    string,
    {
      classId: string;
      className: string;
      gradeLevel: string | null;
      studentCount: number;
      xpSum: number;
      xpWeekSum: number;
      gradeSum: number;
      gradeCount: number;
      missionTotal: number;
      missionDone: number;
      exerciseTotal: number;
      exerciseDone: number;
      attendanceTotal: number;
      attendancePresent: number;
    }
  >,
  metric: ClassRankingMetric
): ClassRankEntry[] {
  const entries: ClassRankEntry[] = [];

  for (const c of classMap.values()) {
    const count = Math.max(c.studentCount, 1);
    const missionRate = c.missionTotal > 0 ? Math.round((c.missionDone / c.missionTotal) * 100) : 0;
    const exerciseRate = c.exerciseTotal > 0 ? Math.round((c.exerciseDone / c.exerciseTotal) * 100) : 0;
    const attendanceRate =
      c.attendanceTotal > 0 ? Math.round((c.attendancePresent / c.attendanceTotal) * 100) : 0;
    const avgGrade = c.gradeCount > 0 ? round1(c.gradeSum / c.gradeCount) : 0;
    const avgXp = Math.round(c.xpSum / count);
    const xpPerStudentWeek = Math.round(c.xpWeekSum / count);
    const engagementScore = Math.round((missionRate + exerciseRate + attendanceRate) / 3);
    const participationScore = Math.round(missionRate * 0.4 + exerciseRate * 0.35 + attendanceRate * 0.25);

    entries.push({
      rank: 0,
      classId: c.classId,
      className: c.className,
      gradeLevel: c.gradeLevel,
      studentCount: c.studentCount,
      engagementScore,
      avgGrade,
      avgXp,
      xpThisWeek: c.xpWeekSum,
      xpPerStudentWeek,
      missionRate,
      exerciseRate,
      attendanceRate,
      participationScore,
    });
  }

  const scoreOf = (e: ClassRankEntry) => {
    switch (metric) {
      case "engagement":
        return e.engagementScore;
      case "xpWeek":
        return e.xpPerStudentWeek;
      case "grade":
        return e.avgGrade;
      case "participation":
        return e.participationScore;
    }
  };

  return entries
    .sort((a, b) => scoreOf(b) - scoreOf(a) || b.studentCount - a.studentCount)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export async function getRankingsOverview(
  schoolId: string | null,
  options?: {
    teacherId?: string;
    currentStudentId?: string;
    anonymizePeers?: boolean;
  }
): Promise<RankingsOverview> {
  if (!schoolId) return emptyRankings();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const studentWhere = options?.teacherId
    ? { user: { schoolId }, ...studentInTeacherClassWhere(options.teacherId) }
    : { user: { schoolId } };

  const classWhere = options?.teacherId
    ? { schoolId, ...teacherClassWhere(options.teacherId) }
    : { schoolId };

  const [students, classes, xpWeekRows, gradeAvgs] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        xpTotal: true,
        level: true,
        user: { select: { fullName: true, avatarUrl: true } },
        classGroup: { select: { id: true, name: true, gradeLevel: true } },
        studentMissions: {
          where: { mission: { isActive: true } },
          select: { completedAt: true, mission: { select: { isActive: true } } },
        },
        studentBadges: { select: { id: true } },
        exerciseSubmissions: { select: { status: true, gradedAt: true } },
        attendance: {
          where: { date: { gte: ninetyDaysAgo } },
          select: { status: true },
        },
      },
    }),
    prisma.classGroup.findMany({
      where: classWhere,
      select: { id: true, name: true, gradeLevel: true, _count: { select: { students: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.xpTransaction.groupBy({
      by: ["studentId"],
      where: {
        createdAt: { gte: weekAgo },
        student: studentWhere,
      },
      _sum: { amount: true },
    }),
    prisma.grade.groupBy({
      by: ["studentId"],
      where: { student: studentWhere },
      _avg: { value: true },
    }),
  ]);

  const xpWeekByStudent = new Map(xpWeekRows.map((r) => [r.studentId, r._sum.amount ?? 0]));
  const gradeAvgByStudent = new Map(gradeAvgs.map((r) => [r.studentId, r._avg.value ?? 0]));

  const studentRows: StudentRow[] = students.map((s) => {
    const avgGrade = round1(gradeAvgByStudent.get(s.id) ?? 0);
    return {
      id: s.id,
      name: s.user.fullName,
      avatarUrl: s.user.avatarUrl,
      classId: s.classGroup?.id ?? null,
      className: s.classGroup?.name ?? "Sem turma",
      level: s.level,
      xpTotal: s.xpTotal,
      xpThisWeek: xpWeekByStudent.get(s.id) ?? 0,
      averageGrade: avgGrade,
      missionsDone: s.studentMissions.filter((sm) => sm.completedAt).length,
      badgesCount: s.studentBadges.length,
    };
  });

  const anonymize = options?.anonymizePeers ?? false;
  const currentStudentId = options?.currentStudentId;

  const metrics: StudentRankingMetric[] = ["xp", "xpWeek", "grade", "missions"];
  const schoolStudentRankings = {} as Record<StudentRankingMetric, StudentRankEntry[]>;
  for (const metric of metrics) {
    schoolStudentRankings[metric] = rankStudents(studentRows, metric, anonymize, currentStudentId);
  }

  const classStudentRankings: Record<string, Record<StudentRankingMetric, StudentRankEntry[]>> = {};
  for (const cls of classes) {
    const inClass = studentRows.filter((s) => s.classId === cls.id);
    classStudentRankings[cls.id] = {} as Record<StudentRankingMetric, StudentRankEntry[]>;
    for (const metric of metrics) {
      classStudentRankings[cls.id][metric] = rankStudents(inClass, metric, anonymize, currentStudentId);
    }
  }

  const classMap = new Map<
    string,
    {
      classId: string;
      className: string;
      gradeLevel: string | null;
      studentCount: number;
      xpSum: number;
      xpWeekSum: number;
      gradeSum: number;
      gradeCount: number;
      missionTotal: number;
      missionDone: number;
      exerciseTotal: number;
      exerciseDone: number;
      attendanceTotal: number;
      attendancePresent: number;
    }
  >();

  for (const cls of classes) {
    classMap.set(cls.id, {
      classId: cls.id,
      className: cls.name,
      gradeLevel: cls.gradeLevel,
      studentCount: cls._count.students,
      xpSum: 0,
      xpWeekSum: 0,
      gradeSum: 0,
      gradeCount: 0,
      missionTotal: 0,
      missionDone: 0,
      exerciseTotal: 0,
      exerciseDone: 0,
      attendanceTotal: 0,
      attendancePresent: 0,
    });
  }

  for (const s of students) {
    const classId = s.classGroup?.id;
    if (!classId || !classMap.has(classId)) continue;
    const bucket = classMap.get(classId)!;

    bucket.xpSum += s.xpTotal;
    bucket.xpWeekSum += xpWeekByStudent.get(s.id) ?? 0;
    const studentAvg = gradeAvgByStudent.get(s.id) ?? 0;
    if (studentAvg > 0) {
      bucket.gradeSum += studentAvg;
      bucket.gradeCount++;
    }

    const activeMissions = s.studentMissions.filter((sm) => sm.mission.isActive);
    bucket.missionTotal += activeMissions.length;
    bucket.missionDone += activeMissions.filter((sm) => sm.completedAt).length;

    bucket.exerciseTotal += s.exerciseSubmissions.length + 2;
    bucket.exerciseDone += s.exerciseSubmissions.filter(
      (sub) => sub.status !== "submitted" || sub.gradedAt
    ).length;

    bucket.attendanceTotal += s.attendance.length || 1;
    bucket.attendancePresent += s.attendance.filter(
      (a) => a.status === "present" || a.status === "late"
    ).length;
  }

  const classRankings = buildClassRankings(classMap, "engagement");

  let currentStudent: RankingsOverview["currentStudent"];
  if (currentStudentId) {
    const me = studentRows.find((s) => s.id === currentStudentId);
    if (me) {
      const positions: NonNullable<RankingsOverview["currentStudent"]>["positions"] = {};
      for (const metric of metrics) {
        const schoolPos = findPosition(schoolStudentRankings[metric], currentStudentId, metric, "school");
        const classList = me.classId ? classStudentRankings[me.classId]?.[metric] : [];
        const classPos = classList ? findPosition(classList, currentStudentId, metric, "class") : undefined;
        if (schoolPos || classPos) {
          positions[metric] = {
            school: schoolPos!,
            class: classPos ?? schoolPos!,
          };
        }
      }
      currentStudent = { classId: me.classId, positions };
    }
  }

  return {
    classRankings,
    schoolStudentRankings,
    classStudentRankings,
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      studentCount: c._count.students,
    })),
    currentStudent,
    healthyCompetitionNote:
      "Competição saudável: celebre o progresso pessoal, respeite colegas e lembre-se  -  cada um evolui no seu ritmo. Rankings semanais equilibram oportunidades para todos.",
  };
}

function emptyRankings(): RankingsOverview {
  const emptyMetric = (): StudentRankEntry[] => [];
  return {
    classRankings: [],
    schoolStudentRankings: {
      xp: emptyMetric(),
      xpWeek: emptyMetric(),
      grade: emptyMetric(),
      missions: emptyMetric(),
    },
    classStudentRankings: {},
    classes: [],
    healthyCompetitionNote:
      "Cadastre turmas e alunos para ativar rankings com competição saudável entre salas.",
  };
}

export function getClassRankingsByMetric(
  classRankings: ClassRankEntry[],
  metric: ClassRankingMetric
): ClassRankEntry[] {
  const scoreOf = (e: ClassRankEntry) => {
    switch (metric) {
      case "engagement":
        return e.engagementScore;
      case "xpWeek":
        return e.xpPerStudentWeek;
      case "grade":
        return e.avgGrade;
      case "participation":
        return e.participationScore;
    }
  };

  return [...classRankings]
    .sort((a, b) => scoreOf(b) - scoreOf(a))
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export function getClassScoreLabel(entry: ClassRankEntry, metric: ClassRankingMetric) {
  switch (metric) {
    case "engagement":
      return `${entry.engagementScore}%`;
    case "xpWeek":
      return `${entry.xpPerStudentWeek} XP/aluno`;
    case "grade":
      return entry.avgGrade.toFixed(1);
    case "participation":
      return `${entry.participationScore}%`;
  }
}
