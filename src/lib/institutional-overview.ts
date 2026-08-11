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
      detail: `Média ${input.weakestSubject.average.toFixed(1)} — ${input.weakestSubject.studentsBelowPass} lançamento(s) abaixo da meta.`,
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

  const settings = await getSchoolSettings(schoolId);
  const passGrade = settings.academic.passGrade;

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
    getDashboardStats(schoolId),
    getEngagementOverview(schoolId),
    computeRiskAlerts(schoolId),
    getMonthlyPerformance(schoolId),
    prisma.student.findMany({
      where: { user: { schoolId } },
      include: { grades: { select: { value: true } } },
    }),
    Promise.all([
      prisma.exercise.count({ where: { schoolId } }),
      prisma.exerciseSubmission.count({
        where: { exercise: { schoolId } },
      }),
      prisma.exerciseSubmission.count({
        where: { exercise: { schoolId }, status: "submitted" },
      }),
    ]),
    prisma.studentTrailProgress.count({
      where: { student: { user: { schoolId } } },
    }),
    prisma.studentBadge.count({
      where: { student: { user: { schoolId } } },
    }),
    prisma.user.count({ where: { schoolId, role: "teacher" } }),
  ]);

  const [exercisesTotal, exerciseSubmissions, exercisePendingGrading] = exerciseStats;

  let studentsWithAvg = 0;
  let studentsPassing = 0;
  for (const s of studentsWithGrades) {
    if (s.grades.length === 0) continue;
    studentsWithAvg++;
    const avg = s.grades.reduce((a, g) => a + g.value, 0) / s.grades.length;
    if (avg >= passGrade) studentsPassing++;
  }
  const passRate = studentsWithAvg > 0 ? (studentsPassing / studentsWithAvg) * 100 : 0;
  const studentsBelowPass = studentsWithAvg - studentsPassing;

  const subjectGradesRaw = await prisma.grade.findMany({
    where: { student: { user: { schoolId } } },
    select: { subject: true, value: true },
  });

  const subjectMap = new Map<string, { sum: number; count: number; below: number }>();
  for (const g of subjectGradesRaw) {
    const cur = subjectMap.get(g.subject) ?? { sum: 0, count: 0, below: 0 };
    cur.sum += g.value;
    cur.count++;
    if (g.value < passGrade) cur.below++;
    subjectMap.set(g.subject, cur);
  }

  const subjectPerformance: SubjectPerformance[] = [...subjectMap.entries()]
    .map(([subject, data]) => ({
      subject,
      average: Math.round((data.sum / data.count) * 10) / 10,
      gradeCount: data.count,
      studentsBelowPass: data.below,
    }))
    .sort((a, b) => a.average - b.average);

  const classGradeData = await prisma.classGroup.findMany({
    where: { schoolId },
    include: {
      students: {
        include: {
          grades: { select: { value: true } },
          attendance: { select: { status: true } },
        },
      },
    },
  });

  const engagementByClass = new Map(engagement.classes.map((c) => [c.classId, c]));

  const classes: ClassOverview[] = classGradeData.map((c) => {
    const eng = engagementByClass.get(c.id);
    const grades = c.students.flatMap((s) => s.grades);
    const avgGrade =
      grades.length > 0 ? grades.reduce((a, g) => a + g.value, 0) / grades.length : 0;

    let withGrades = 0;
    let passing = 0;
    for (const s of c.students) {
      if (s.grades.length === 0) continue;
      withGrades++;
      const avg = s.grades.reduce((a, g) => a + g.value, 0) / s.grades.length;
      if (avg >= passGrade) passing++;
    }

    const att = c.students.flatMap((s) => s.attendance);
    const attPresent = att.filter((a) => a.status === "present" || a.status === "late").length;
    const attendanceRate = att.length > 0 ? Math.round((attPresent / att.length) * 100) : 0;

    return {
      classId: c.id,
      className: c.name,
      studentCount: c.students.length,
      averageGrade: Math.round(avgGrade * 10) / 10,
      passRate: withGrades > 0 ? Math.round((passing / withGrades) * 100) : 0,
      attendanceRate,
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

  const gradeScore = Math.min(100, (stats.averageGrade / passGrade) * 100);
  const attendanceScore = stats.attendanceRate;
  const engagementScore = Math.round(
    (engagement.avgMissionRate + engagement.avgExerciseRate + engagement.avgAttendanceRate) / 3
  );
  const alertPenalty = Math.min(30, alerts.filter((a) => a.severity === "high").length * 5);
  const healthScore = Math.max(
    0,
    Math.round(gradeScore * 0.3 + attendanceScore * 0.25 + engagementScore * 0.25 + (100 - alertPenalty) * 0.2)
  );

  const improvements = buildImprovements({
    passRate,
    attendanceRate: stats.attendanceRate,
    pendingSubmissions: engagement.pendingSubmissions,
    avgMissionRate: engagement.avgMissionRate,
    avgExerciseRate: engagement.avgExerciseRate,
    alertsHigh: alerts.filter((a) => a.severity === "high").length,
    weakestSubject: subjectPerformance[0],
  });

  return {
    passGrade,
    maxGrade: settings.academic.maxGrade,
    totalStudents: stats.totalStudents,
    totalClasses: stats.totalClasses,
    totalTeachers: teachers,
    averageGrade: Math.round(stats.averageGrade * 10) / 10,
    passRate: Math.round(passRate),
    studentsBelowPass,
    studentsWithGrades: studentsWithAvg,
    attendanceRate: Math.round(stats.attendanceRate),
    activeMissions: stats.activeMissions,
    totalXpAwarded: stats.totalXpAwarded,
    xpThisWeek: engagement.xpThisWeek,
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
