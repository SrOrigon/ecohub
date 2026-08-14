import { prisma } from "@/lib/db";
import { getEngagementOverview, type EngagementOverview } from "@/lib/engagement";
import { computeRiskAlerts, type RiskAlert } from "@/lib/risk-alerts";
import { getDashboardStats, getMonthlyPerformance } from "@/lib/queries";
import { getSchoolSettings } from "@/lib/school-settings";

export type SubjectPerformance = {
  subject: string;
  average: number;
  gradeCount: number;
  studentsBelowPass: number;
};

export type ClassOverview = {
  classId: string;
  className: string;
  studentCount: number;
  averageGrade: number;
  passRate: number;
  attendanceRate: number;
  engagementScore: number;
  missionRate: number;
  exerciseRate: number;
};

export type ImprovementArea = {
  area: string;
  severity: "high" | "medium" | "low";
  detail: string;
  actionHref: string;
};

export type InstitutionalOverview = {
  passGrade: number;
  maxGrade: number;
  totalStudents: number;
  totalClasses: number;
  totalTeachers: number;
  averageGrade: number;
  passRate: number;
  studentsBelowPass: number;
  studentsWithGrades: number;
  attendanceRate: number;
  activeMissions: number;
  totalXpAwarded: number;
  xpThisWeek: number;
  exercisesTotal: number;
  exerciseSubmissions: number;
  exercisePendingGrading: number;
  exerciseCompletionRate: number;
  trailProgressCount: number;
  badgeEarnedCount: number;
  healthScore: number;
  healthLabel: "Excelente" | "Bom" | "Atenção" | "Crítico";
  alertsTotal: number;
  alertsHigh: number;
  alertsMedium: number;
  topAlerts: RiskAlert[];
  subjectPerformance: SubjectPerformance[];
  classes: ClassOverview[];
  monthlyTrend: Awaited<ReturnType<typeof getMonthlyPerformance>>;
  improvements: ImprovementArea[];
  engagement: EngagementOverview;
};

function healthFromScore(score: number): InstitutionalOverview["healthLabel"] {
  if (score >= 80) return "Excelente";
  if (score >= 65) return "Bom";
  if (score >= 50) return "Atenção";
  return "Crítico";
}

function buildImprovements(input: {
  passRate: number;
  attendanceRate: number;
  pendingSubmissions: number;
  avgMissionRate: number;
  avgExerciseRate: number;
  alertsHigh: number;
  weakestSubject?: SubjectPerformance;
}): ImprovementArea[] {
  const items: ImprovementArea[] = [];

  if (input.passRate < 70) {
    items.push({
      area: "Desempenho acadêmico",
      severity: input.passRate < 50 ? "high" : "medium",
      detail: `Apenas ${Math.round(input.passRate)}% dos alunos estão com média na meta. Priorize reforço e acompanhamento.`,
      actionHref: "/dashboard/alertas",
    });
  }

  if (input.attendanceRate < 85) {
    items.push({
      area: "Frequência",
      severity: input.attendanceRate < 75 ? "high" : "medium",
      detail: `Frequência institucional em ${Math.round(input.attendanceRate)}%. Revise faltas e contato com famílias.`,
      actionHref: "/dashboard/frequencia",
    });
  }

  if (input.pendingSubmissions > 0) {
    items.push({
      area: "Correção de exercícios",
      severity: input.pendingSubmissions > 10 ? "high" : "medium",
      detail: `${input.pendingSubmissions} entrega(s) aguardando correção dos professores.`,
      actionHref: "/dashboard/exercicios",
    });
  }

  if (input.avgMissionRate < 55) {
    items.push({
      area: "Missões e gamificação",
      severity: "medium",
      detail: `Taxa média de conclusão de missões: ${input.avgMissionRate}%. Considere missões mais acessíveis.`,
      actionHref: "/dashboard/gamificacao",
    });
  }

  if (input.avgExerciseRate < 55) {
    items.push({
      area: "Exercícios digitais",
      severity: "medium",
      detail: `Participação em exercícios em ${input.avgExerciseRate}%. Incentive entregas no portal.`,
      actionHref: "/dashboard/exercicios",
    });
  }

  if (input.alertsHigh > 0) {
    items.push({
      area: "Alertas críticos",
      severity: "high",
      detail: `${input.alertsHigh} aluno(s) em situação crítica (nota ou frequência).`,
      actionHref: "/dashboard/alertas",
    });
  }

  if (input.weakestSubject && input.weakestSubject.average < 6) {
    items.push({
      area: `Disciplina: ${input.weakestSubject.subject}`,
      severity: input.weakestSubject.average < 5 ? "high" : "medium",
      detail: `Média ${input.weakestSubject.average.toFixed(1)}  -  ${input.weakestSubject.studentsBelowPass} lançamento(s) abaixo da meta.`,
      actionHref: "/dashboard/notas",
    });
  }

  if (items.length === 0) {
    items.push({
      area: "Instituição em equilíbrio",
      severity: "low",
      detail: "Indicadores dentro das metas. Continue monitorando e compartilhe boas práticas entre turmas.",
      actionHref: "/dashboard/relatorios",
    });
  }

  return items.slice(0, 6);
}

export async function getInstitutionalOverview(schoolId: string | null): Promise<InstitutionalOverview> {
  if (!schoolId) {
    return emptyOverview();
  }

  try {
    const settings = await getSchoolSettings(schoolId);
    const passGrade = settings.academic?.passGrade ?? 7;

    const [
      stats,
      engagement,
      alerts,
      monthlyTrend,
      studentsWithGrades,
      exerciseStats,
      trailProgress,
      badgeCount,
      teachers,
    ] = await Promise.all([
      getDashboardStats(schoolId).catch(() => ({
        totalStudents: 0,
        totalClasses: 0,
        averageGrade: 0,
        attendanceRate: 0,
        activeMissions: 0,
        totalXpAwarded: 0,
      })),
      getEngagementOverview(schoolId).catch(() => ({
        totalStudents: 0,
        activeMissions: 0,
        pendingSubmissions: 0,
        avgMissionRate: 0,
        avgExerciseRate: 0,
        avgAttendanceRate: 0,
        xpThisWeek: 0,
        classes: [],
        topStudents: [],
      })),
      computeRiskAlerts(schoolId).catch(() => []),
      getMonthlyPerformance(schoolId).catch(() => []),
      prisma.student.findMany({
        where: { user: { schoolId } },
        select: { id: true, grades: { select: { value: true } } },
      }).catch(() => []),
      Promise.all([
        prisma.exercise.count({ where: { schoolId } }),
        prisma.exerciseSubmission.count({
          where: { exercise: { schoolId } },
        }),
        prisma.exerciseSubmission.count({
          where: { exercise: { schoolId }, status: "submitted" },
        }),
      ]).catch(() => [0, 0, 0]),
      prisma.studentTrailProgress.count({
        where: { student: { user: { schoolId } } },
      }).catch(() => 0),
      prisma.studentBadge.count({
        where: { student: { user: { schoolId } } },
      }).catch(() => 0),
      prisma.user.count({ where: { schoolId, role: "teacher" } }).catch(() => 0),
    ]);

    const [exercisesTotal, exerciseSubmissions, exercisePendingGrading] = exerciseStats;

    let studentsWithAvg = 0;
    let studentsPassing = 0;
    for (const s of studentsWithGrades) {
      if (!s.grades || s.grades.length === 0) continue;
      studentsWithAvg++;
      const avg = s.grades.reduce((a, g) => a + (g.value ?? 0), 0) / s.grades.length;
      if (avg >= passGrade) studentsPassing++;
    }
    const passRate = studentsWithAvg > 0 ? (studentsPassing / studentsWithAvg) * 100 : 0;
    const studentsBelowPass = studentsWithAvg - studentsPassing;

    const subjectGradesRaw = await prisma.grade.findMany({
      where: { student: { user: { schoolId } } },
      select: { subject: true, value: true },
    }).catch(() => []);

    const subjectMap = new Map<string, { sum: number; count: number; below: number }>();
    for (const g of subjectGradesRaw) {
      if (!g.subject) continue;
      const cur = subjectMap.get(g.subject) ?? { sum: 0, count: 0, below: 0 };
      const val = g.value ?? 0;
      cur.sum += val;
      cur.count++;
      if (val < passGrade) cur.below++;
      subjectMap.set(g.subject, cur);
    }

    const subjectPerformance: SubjectPerformance[] = [...subjectMap.entries()]
      .map(([subject, data]) => ({
        subject,
        average: data.count > 0 ? Math.round((data.sum / data.count) * 10) / 10 : 0,
        gradeCount: data.count,
        studentsBelowPass: data.below,
      }))
      .sort((a, b) => a.average - b.average);

    const [classList, gradesWithStudent, studentClassRows] = await Promise.all([
      prisma.classGroup.findMany({
        where: { schoolId },
        select: { id: true, name: true, _count: { select: { students: true } } },
      }).catch(() => []),
      prisma.grade.findMany({
        where: { student: { user: { schoolId } } },
        select: { value: true, studentId: true },
      }).catch(() => []),
      prisma.student.findMany({
        where: { user: { schoolId }, classId: { not: null } },
        select: { id: true, classId: true },
      }).catch(() => []),
    ]);

    const classIdByStudent = new Map(studentClassRows.map((s) => [s.id, s.classId!]));
    const gradesByStudent = new Map<string, number[]>();
    for (const grade of gradesWithStudent) {
      const list = gradesByStudent.get(grade.studentId) ?? [];
      list.push(grade.value ?? 0);
      gradesByStudent.set(grade.studentId, list);
    }

    const engagementByClass = new Map(engagement.classes.map((c) => [c.classId, c]));

    const classes: ClassOverview[] = classList.map((c) => {
      const eng = engagementByClass.get(c.id);
      const classGrades: number[] = [];
      let withGrades = 0;
      let passing = 0;

      for (const [studentId, classId] of classIdByStudent) {
        if (classId !== c.id) continue;
        const studentGrades = gradesByStudent.get(studentId);
        if (!studentGrades?.length) continue;
        withGrades++;
        const avg = studentGrades.reduce((a, g) => a + g, 0) / studentGrades.length;
        if (avg >= passGrade) passing++;
        classGrades.push(...studentGrades);
      }

      const avgGrade =
        classGrades.length > 0 ? classGrades.reduce((a, g) => a + g, 0) / classGrades.length : 0;

      return {
        classId: c.id,
        className: c.name,
        studentCount: c._count.students,
        averageGrade: Math.round(avgGrade * 10) / 10,
        passRate: withGrades > 0 ? Math.round((passing / withGrades) * 100) : 0,
        attendanceRate: eng?.attendanceRate ?? 0,
        engagementScore: eng?.engagementScore ?? 0,
        missionRate: eng?.missionRate ?? 0,
        exerciseRate: eng?.exerciseRate ?? 0,
      };
    });

    classes.sort((a, b) => a.averageGrade - b.averageGrade);

    const exerciseCompletionRate =
      exerciseSubmissions > 0
        ? Math.round(((exerciseSubmissions - exercisePendingGrading) / exerciseSubmissions) * 100)
        : 0;

    const safePassGrade = passGrade > 0 ? passGrade : 7;
    const rawAverage = isNaN(stats.averageGrade) ? 0 : stats.averageGrade;
    const gradeScore = Math.min(100, (rawAverage / safePassGrade) * 100);
    const attendanceScore = isNaN(stats.attendanceRate) ? 0 : stats.attendanceRate;
    const engagementScore = Math.round(
      ((engagement.avgMissionRate ?? 0) + (engagement.avgExerciseRate ?? 0) + (engagement.avgAttendanceRate ?? 0)) / 3
    );
    const alertPenalty = Math.min(30, alerts.filter((a) => a.severity === "high").length * 5);
    const rawHealthScore = Math.round(gradeScore * 0.3 + attendanceScore * 0.25 + engagementScore * 0.25 + (100 - alertPenalty) * 0.2);
    const healthScore = isNaN(rawHealthScore) ? 0 : Math.max(0, Math.min(100, rawHealthScore));

    const improvements = buildImprovements({
      passRate: isNaN(passRate) ? 0 : passRate,
      attendanceRate: attendanceScore,
      pendingSubmissions: engagement.pendingSubmissions ?? 0,
      avgMissionRate: engagement.avgMissionRate ?? 0,
      avgExerciseRate: engagement.avgExerciseRate ?? 0,
      alertsHigh: alerts.filter((a) => a.severity === "high").length,
      weakestSubject: subjectPerformance[0],
    });

    return {
      passGrade: safePassGrade,
      maxGrade: settings.academic?.maxGrade ?? 10,
      totalStudents: stats.totalStudents,
      totalClasses: stats.totalClasses,
      totalTeachers: teachers,
      averageGrade: Math.round(rawAverage * 10) / 10,
      passRate: isNaN(passRate) ? 0 : Math.round(passRate),
      studentsBelowPass,
      studentsWithGrades: studentsWithAvg,
      attendanceRate: Math.round(attendanceScore),
      activeMissions: stats.activeMissions,
      totalXpAwarded: stats.totalXpAwarded,
      xpThisWeek: engagement.xpThisWeek ?? 0,
      exercisesTotal,
      exerciseSubmissions,
      exercisePendingGrading,
      exerciseCompletionRate,
      trailProgressCount: trailProgress,
      badgeEarnedCount: badgeCount,
      healthScore,
      healthLabel: healthFromScore(healthScore),
      alertsTotal: alerts.length,
      alertsHigh: alerts.filter((a) => a.severity === "high").length,
      alertsMedium: alerts.filter((a) => a.severity === "medium").length,
      topAlerts: alerts.slice(0, 8),
      subjectPerformance,
      classes,
      monthlyTrend,
      improvements,
      engagement,
    };
  } catch (err) {
    console.error("[getInstitutionalOverview] Error:", err);
    return emptyOverview();
  }
}

function emptyOverview(): InstitutionalOverview {
  return {
    passGrade: 7,
    maxGrade: 10,
    totalStudents: 0,
    totalClasses: 0,
    totalTeachers: 0,
    averageGrade: 0,
    passRate: 0,
    studentsBelowPass: 0,
    studentsWithGrades: 0,
    attendanceRate: 0,
    activeMissions: 0,
    totalXpAwarded: 0,
    xpThisWeek: 0,
    exercisesTotal: 0,
    exerciseSubmissions: 0,
    exercisePendingGrading: 0,
    exerciseCompletionRate: 0,
    trailProgressCount: 0,
    badgeEarnedCount: 0,
    healthScore: 0,
    healthLabel: "Crítico",
    alertsTotal: 0,
    alertsHigh: 0,
    alertsMedium: 0,
    topAlerts: [],
    subjectPerformance: [],
    classes: [],
    monthlyTrend: [],
    improvements: [],
    engagement: {
      totalStudents: 0,
      activeMissions: 0,
      pendingSubmissions: 0,
      avgMissionRate: 0,
      avgExerciseRate: 0,
      avgAttendanceRate: 0,
      xpThisWeek: 0,
      classes: [],
      topStudents: [],
    },
  };
}
