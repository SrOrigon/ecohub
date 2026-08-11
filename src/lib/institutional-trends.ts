import { prisma } from "@/lib/db";
import { getSchoolSettings } from "@/lib/school-settings";

export type TrendDirection = "up" | "down" | "stable";
export type TrendSentiment = "positive" | "negative" | "neutral";

export type PeriodSnapshot = {
  label: string;
  start: string;
  end: string;
  averageGrade: number;
  attendanceRate: number;
  passRate: number;
  xpTotal: number;
  exerciseSubmissions: number;
  gradesCount: number;
  healthScore: number;
  dataPoints: number;
};

export type MetricTrend = {
  id: string;
  label: string;
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number | null;
  direction: TrendDirection;
  sentiment: TrendSentiment;
  unit: "nota" | "%" | "xp" | "qtd" | "score";
};

export type PeriodComparison = {
  kind: "monthly" | "semester" | "annual";
  kindLabel: string;
  current: PeriodSnapshot;
  previous: PeriodSnapshot;
  trends: MetricTrend[];
  summary: string;
  strategicNotes: string[];
};

export type TimelinePoint = {
  key: string;
  label: string;
  averageGrade: number;
  attendanceRate: number;
  passRate: number;
  xp: number;
  healthScore: number;
};

export type TemporalAnalysis = {
  monthly: PeriodComparison;
  semester: PeriodComparison;
  annual: PeriodComparison;
  timeline: TimelinePoint[];
  overallVerdict: string;
};

type RawGrade = { value: number; createdAt: Date; studentId: string };
type RawAttendance = { status: string; date: Date };
type RawXp = { amount: number; createdAt: Date };
type RawSubmission = { createdAt: Date };

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function inRange(date: Date, start: Date, end: Date) {
  return date >= start && date <= end;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round0(n: number) {
  return Math.round(n);
}

function direction(delta: number, threshold = 0.5): TrendDirection {
  if (Math.abs(delta) < threshold) return "stable";
  return delta > 0 ? "up" : "down";
}

function computePassRate(grades: RawGrade[], passGrade: number): number {
  const byStudent = new Map<string, number[]>();
  for (const g of grades) {
    const list = byStudent.get(g.studentId) ?? [];
    list.push(g.value);
    byStudent.set(g.studentId, list);
  }
  if (byStudent.size === 0) return 0;
  let passing = 0;
  for (const vals of byStudent.values()) {
    const avg = vals.reduce((a, v) => a + v, 0) / vals.length;
    if (avg >= passGrade) passing++;
  }
  return (passing / byStudent.size) * 100;
}

function computeHealthScore(avg: number, passGrade: number, freq: number, passRate: number): number {
  const gradeScore = passGrade > 0 ? Math.min(100, (avg / passGrade) * 100) : 0;
  return Math.max(0, Math.round(gradeScore * 0.35 + freq * 0.3 + passRate * 0.35));
}

function filterGrades(grades: RawGrade[], start: Date, end: Date) {
  return grades.filter((g) => inRange(g.createdAt, start, end));
}

function filterAttendance(att: RawAttendance[], start: Date, end: Date) {
  return att.filter((a) => inRange(a.date, start, end));
}

function filterXp(xp: RawXp[], start: Date, end: Date) {
  return xp.filter((x) => inRange(x.createdAt, start, end));
}

function filterSubmissions(subs: RawSubmission[], start: Date, end: Date) {
  return subs.filter((s) => inRange(s.createdAt, start, end));
}

function buildSnapshot(
  label: string,
  start: Date,
  end: Date,
  grades: RawGrade[],
  attendance: RawAttendance[],
  xp: RawXp[],
  submissions: RawSubmission[],
  passGrade: number
): PeriodSnapshot {
  const g = filterGrades(grades, start, end);
  const a = filterAttendance(attendance, start, end);
  const x = filterXp(xp, start, end);
  const s = filterSubmissions(submissions, start, end);

  const averageGrade =
    g.length > 0 ? g.reduce((sum, item) => sum + item.value, 0) / g.length : 0;
  const present = a.filter((item) => item.status === "present" || item.status === "late").length;
  const attendanceRate = a.length > 0 ? (present / a.length) * 100 : 0;
  const passRate = computePassRate(g, passGrade);
  const xpTotal = x.reduce((sum, item) => sum + item.amount, 0);
  const healthScore = computeHealthScore(averageGrade, passGrade, attendanceRate, passRate);

  return {
    label,
    start: start.toISOString(),
    end: end.toISOString(),
    averageGrade: round1(averageGrade),
    attendanceRate: round0(attendanceRate),
    passRate: round0(passRate),
    xpTotal,
    exerciseSubmissions: s.length,
    gradesCount: g.length,
    healthScore,
    dataPoints: g.length + a.length,
  };
}

function buildTrend(
  id: string,
  label: string,
  current: number,
  previous: number,
  unit: MetricTrend["unit"],
  higherIsBetter: boolean
): MetricTrend {
  const delta = round1(current - previous);
  const deltaPercent =
    previous !== 0 ? round0(((current - previous) / Math.abs(previous)) * 100) : null;
  const dir = direction(delta, unit === "nota" ? 0.2 : unit === "score" ? 2 : 1);
  let sentiment: TrendSentiment = "neutral";
  if (dir === "stable") sentiment = "neutral";
  else if (higherIsBetter) sentiment = dir === "up" ? "positive" : "negative";
  else sentiment = dir === "down" ? "positive" : "negative";

  return { id, label, current, previous, delta, deltaPercent, direction: dir, sentiment, unit };
}

function buildTrends(current: PeriodSnapshot, previous: PeriodSnapshot): MetricTrend[] {
  return [
    buildTrend("grade", "Média de notas", current.averageGrade, previous.averageGrade, "nota", true),
    buildTrend("attendance", "Frequência", current.attendanceRate, previous.attendanceRate, "%", true),
    buildTrend("passRate", "Taxa de aprovação", current.passRate, previous.passRate, "%", true),
    buildTrend("xp", "XP distribuído", current.xpTotal, previous.xpTotal, "xp", true),
    buildTrend(
      "exercises",
      "Entregas de exercícios",
      current.exerciseSubmissions,
      previous.exerciseSubmissions,
      "qtd",
      true
    ),
    buildTrend("health", "Saúde pedagógica", current.healthScore, previous.healthScore, "score", true),
  ];
}

function monthLabel(d: Date) {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
}

function buildStrategicNotes(trends: MetricTrend[], kindLabel: string): string[] {
  const notes: string[] = [];
  const improved = trends.filter((t) => t.sentiment === "positive" && t.direction !== "stable");
  const declined = trends.filter((t) => t.sentiment === "negative" && t.direction !== "stable");

  if (improved.length > 0) {
    notes.push(
      `Melhorias ${kindLabel}: ${improved.map((t) => `${t.label} (${t.delta > 0 ? "+" : ""}${t.unit === "nota" ? t.delta.toFixed(1) : Math.round(t.delta)})`).join(", ")}.`
    );
  }

  if (declined.length > 0) {
    notes.push(
      `Atenção ${kindLabel}: ${declined.map((t) => `${t.label} (${t.delta > 0 ? "+" : ""}${round1(t.delta)})`).join(", ")} — priorize plano de ação.`
    );
  }

  const health = trends.find((t) => t.id === "health");
  if (health?.direction === "up" && health.sentiment === "positive") {
    notes.push("Tendência institucional positiva: indicadores pedagógicos consolidando evolução.");
  } else if (health?.direction === "down" && health.sentiment === "negative") {
    notes.push("Tendência de queda na saúde pedagógica: convoque equipe para revisão curricular e acompanhamento.");
  }

  if (notes.length === 0) {
    notes.push("Período estável — mantenha monitoramento e documente boas práticas das turmas de destaque.");
  }

  return notes.slice(0, 4);
}

function buildSummary(trends: MetricTrend[], kindLabel: string, current: PeriodSnapshot): string {
  const health = trends.find((t) => t.id === "health");
  const grade = trends.find((t) => t.id === "grade");
  const freq = trends.find((t) => t.id === "attendance");

  if (current.dataPoints === 0) {
    return `Sem dados suficientes no período ${kindLabel.toLowerCase()} para comparar evolução. Lance notas e frequência.`;
  }

  const parts: string[] = [];
  if (health) {
    parts.push(
      `Saúde pedagógica ${health.direction === "up" ? "subiu" : health.direction === "down" ? "caiu" : "manteve-se"} (${current.healthScore} pts).`
    );
  }
  if (grade && grade.direction !== "stable") {
    parts.push(`Média ${grade.direction === "up" ? "melhorou" : "piorou"} ${Math.abs(grade.delta).toFixed(1)} ponto(s).`);
  }
  if (freq && freq.direction !== "stable") {
    parts.push(`Frequência ${freq.direction === "up" ? "aumentou" : "reduziu"} ${Math.abs(freq.delta)} p.p.`);
  }
  return parts.join(" ") || `Indicadores ${kindLabel.toLowerCase()} estáveis em relação ao período anterior.`;
}

function buildComparison(
  kind: PeriodComparison["kind"],
  kindLabel: string,
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date,
  currentLabel: string,
  previousLabel: string,
  grades: RawGrade[],
  attendance: RawAttendance[],
  xp: RawXp[],
  submissions: RawSubmission[],
  passGrade: number
): PeriodComparison {
  const current = buildSnapshot(
    currentLabel,
    currentStart,
    currentEnd,
    grades,
    attendance,
    xp,
    submissions,
    passGrade
  );
  const previous = buildSnapshot(
    previousLabel,
    previousStart,
    previousEnd,
    grades,
    attendance,
    xp,
    submissions,
    passGrade
  );
  const trends = buildTrends(current, previous);
  return {
    kind,
    kindLabel,
    current,
    previous,
    trends,
    summary: buildSummary(trends, kindLabel, current),
    strategicNotes: buildStrategicNotes(trends, kindLabel.toLowerCase()),
  };
}

function buildOverallVerdict(
  monthly: PeriodComparison,
  semester: PeriodComparison,
  annual: PeriodComparison
): string {
  const scores = [
    { t: monthly.trends.find((x) => x.id === "health") },
    { t: semester.trends.find((x) => x.id === "health") },
    { t: annual.trends.find((x) => x.id === "health") },
  ];

  const up = scores.filter((s) => s.t?.direction === "up").length;
  const down = scores.filter((s) => s.t?.direction === "down").length;

  if (up >= 2 && down === 0) {
    return "Panorama estratégico favorável: evolução consistente em múltiplos horizontes temporais.";
  }
  if (down >= 2) {
    return "Panorama exige intervenção: deterioração perceptível em mais de um ciclo de análise.";
  }
  if (up === 1 && down === 1) {
    return "Cenário misto: ganhos recentes coexistem com desafios de médio prazo — alinhe metas por turma.";
  }
  return "Instituição em fase de consolidação — use os ciclos mensal, semestral e anual para decisões pedagógicas.";
}

export async function getTemporalAnalysis(schoolId: string | null): Promise<TemporalAnalysis> {
  if (!schoolId) return emptyTemporalAnalysis();

  const settings = await getSchoolSettings(schoolId);
  const passGrade = settings.academic.passGrade;
  const now = new Date();

  const [grades, attendance, xp, submissions] = await Promise.all([
    prisma.grade.findMany({
      where: { student: { user: { schoolId } } },
      select: { value: true, createdAt: true, studentId: true },
    }),
    prisma.attendance.findMany({
      where: { student: { user: { schoolId } } },
      select: { status: true, date: true },
    }),
    prisma.xpTransaction.findMany({
      where: { student: { user: { schoolId } } },
      select: { amount: true, createdAt: true },
    }),
    prisma.exerciseSubmission.findMany({
      where: { exercise: { schoolId } },
      select: { submittedAt: true },
    }),
  ]);

  const rawGrades: RawGrade[] = grades.map((g) => ({
    value: g.value,
    createdAt: g.createdAt,
    studentId: g.studentId,
  }));
  const rawAtt: RawAttendance[] = attendance.map((a) => ({ status: a.status, date: a.date }));
  const rawXp: RawXp[] = xp.map((x) => ({ amount: x.amount, createdAt: x.createdAt }));
  const rawSubs: RawSubmission[] = submissions.map((s) => ({ createdAt: s.submittedAt }));

  const curMonthStart = startOfMonth(now);
  const prevMonthEnd = endOfMonth(addMonths(now, -1));
  const prevMonthStart = startOfMonth(addMonths(now, -1));

  const monthly = buildComparison(
    "monthly",
    "Comparativo mensal",
    curMonthStart,
    now,
    prevMonthStart,
    prevMonthEnd,
    monthLabel(now),
    monthLabel(addMonths(now, -1)),
    rawGrades,
    rawAtt,
    rawXp,
    rawSubs,
    passGrade
  );

  const semester = buildComparison(
    "semester",
    "Comparativo semestral",
    addMonths(now, -6),
    now,
    addMonths(now, -12),
    addMonths(now, -6),
    "Últimos 6 meses",
    "6 meses anteriores",
    rawGrades,
    rawAtt,
    rawXp,
    rawSubs,
    passGrade
  );

  const annual = buildComparison(
    "annual",
    "Comparativo anual",
    addMonths(now, -12),
    now,
    addMonths(now, -24),
    addMonths(now, -12),
    "Últimos 12 meses",
    "Ano anterior (12m)",
    rawGrades,
    rawAtt,
    rawXp,
    rawSubs,
    passGrade
  );

  const timeline: TimelinePoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = addMonths(now, -i);
    const start = startOfMonth(d);
    const end = i === 0 ? now : endOfMonth(d);
    const snap = buildSnapshot(
      monthLabel(d),
      start,
      end,
      rawGrades,
      rawAtt,
      rawXp,
      rawSubs,
      passGrade
    );
    timeline.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: snap.label,
      averageGrade: snap.averageGrade,
      attendanceRate: snap.attendanceRate,
      passRate: snap.passRate,
      xp: snap.xpTotal,
      healthScore: snap.healthScore,
    });
  }

  return {
    monthly,
    semester,
    annual,
    timeline,
    overallVerdict: buildOverallVerdict(monthly, semester, annual),
  };
}

function emptyPeriodComparison(kind: PeriodComparison["kind"], kindLabel: string): PeriodComparison {
  const emptySnap: PeriodSnapshot = {
    label: "—",
    start: "",
    end: "",
    averageGrade: 0,
    attendanceRate: 0,
    passRate: 0,
    xpTotal: 0,
    exerciseSubmissions: 0,
    gradesCount: 0,
    healthScore: 0,
    dataPoints: 0,
  };
  return {
    kind,
    kindLabel,
    current: emptySnap,
    previous: emptySnap,
    trends: [],
    summary: "Sem dados históricos.",
    strategicNotes: [],
  };
}

function emptyTemporalAnalysis(): TemporalAnalysis {
  return {
    monthly: emptyPeriodComparison("monthly", "Comparativo mensal"),
    semester: emptyPeriodComparison("semester", "Comparativo semestral"),
    annual: emptyPeriodComparison("annual", "Comparativo anual"),
    timeline: [],
    overallVerdict: "Cadastre dados acadêmicos para iniciar a análise temporal.",
  };
}
