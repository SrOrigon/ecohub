import { prisma } from "@/lib/db";
import { getSchoolSettings } from "@/lib/school-settings";
import type { MetricTrend, PeriodComparison, PeriodSnapshot } from "@/lib/institutional-trends";

export type HistoryGranularity = "day" | "week" | "month" | "semester" | "year";

export type HistoryMeta = {
  originDate: string;
  originLabel: string;
  accountAgeDays: number;
  accountAgeLabel: string;
  firstDataDate: string | null;
  lastDataDate: string;
  totalGrades: number;
  totalAttendance: number;
  totalXpEvents: number;
  totalSubmissions: number;
};

export type HistorySeries = {
  granularity: HistoryGranularity;
  granularityLabel: string;
  bucketCount: number;
  buckets: PeriodSnapshot[];
  latestComparison: PeriodComparison | null;
};

export type InstitutionalHistory = {
  meta: HistoryMeta;
  lifetime: PeriodSnapshot;
  series: Record<HistoryGranularity, HistorySeries>;
  availableGranularities: HistoryGranularity[];
  insights: string[];
};

type RawGrade = { value: number; createdAt: Date; studentId: string };
type RawAttendance = { status: string; date: Date };
type RawXp = { amount: number; createdAt: Date };
type RawSubmission = { createdAt: Date };

type BucketDef = { start: Date; end: Date; label: string; key: string };

const GRANULARITY_LABELS: Record<HistoryGranularity, string> = {
  day: "Por dia",
  week: "Por semana",
  month: "Por mês",
  semester: "Por semestre",
  year: "Por ano",
};

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
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

function formatOriginLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatAccountAge(days: number) {
  if (days < 1) return "menos de 1 dia";
  if (days < 30) return `${days} dia(s)`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    const rest = days % 30;
    return rest > 0 ? `${months} mês(es) e ${rest} dia(s)` : `${months} mês(es)`;
  }
  const years = Math.floor(days / 365);
  const restDays = days % 365;
  const months = Math.floor(restDays / 30);
  if (months > 0) return `${years} ano(s) e ${months} mês(es)`;
  return `${years} ano(s)`;
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
  const g = grades.filter((item) => inRange(item.createdAt, start, end));
  const a = attendance.filter((item) => inRange(item.date, start, end));
  const x = xp.filter((item) => inRange(item.createdAt, start, end));
  const s = submissions.filter((item) => inRange(item.createdAt, start, end));

  const averageGrade = g.length > 0 ? g.reduce((sum, item) => sum + item.value, 0) / g.length : 0;
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
  const threshold = unit === "nota" ? 0.2 : unit === "score" ? 2 : 1;
  const dir = Math.abs(delta) < threshold ? "stable" : delta > 0 ? "up" : "down";
  let sentiment: MetricTrend["sentiment"] = "neutral";
  if (dir !== "stable") {
    sentiment = higherIsBetter ? (dir === "up" ? "positive" : "negative") : dir === "down" ? "positive" : "negative";
  }
  return { id, label, current, previous, delta, deltaPercent, direction: dir, sentiment, unit };
}

function buildBucketComparison(
  granularity: HistoryGranularity,
  current: PeriodSnapshot,
  previous: PeriodSnapshot
): PeriodComparison {
  const trends: MetricTrend[] = [
    buildTrend("grade", "Média de notas", current.averageGrade, previous.averageGrade, "nota", true),
    buildTrend("attendance", "Frequência", current.attendanceRate, previous.attendanceRate, "%", true),
    buildTrend("passRate", "Taxa de aprovação", current.passRate, previous.passRate, "%", true),
    buildTrend("xp", "XP distribuído", current.xpTotal, previous.xpTotal, "xp", true),
    buildTrend(
      "exercises",
      "Entregas",
      current.exerciseSubmissions,
      previous.exerciseSubmissions,
      "qtd",
      true
    ),
    buildTrend("health", "Saúde pedagógica", current.healthScore, previous.healthScore, "score", true),
  ];

  const kindMap: Record<HistoryGranularity, PeriodComparison["kind"]> = {
    day: "monthly",
    week: "monthly",
    month: "monthly",
    semester: "semester",
    year: "annual",
  };

  return {
    kind: kindMap[granularity],
    kindLabel: `Último vs anterior (${GRANULARITY_LABELS[granularity].toLowerCase()})`,
    current,
    previous,
    trends,
    summary:
      current.dataPoints === 0
        ? "Sem dados no período mais recente."
        : `Comparando ${current.label} com ${previous.label}.`,
    strategicNotes: [],
  };
}

function startOfWeekMonday(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const r = startOfDay(d);
  r.setDate(r.getDate() + diff);
  return r;
}

function generateDayBuckets(origin: Date, now: Date): BucketDef[] {
  const maxDays = 90;
  const earliest = new Date(Math.max(origin.getTime(), addDays(now, -maxDays + 1).getTime()));
  const buckets: BucketDef[] = [];
  let cursor = startOfDay(earliest);
  while (cursor <= now) {
    const start = new Date(cursor);
    const end = endOfDay(cursor);
    const effectiveEnd = end > now ? now : end;
    buckets.push({
      start,
      end: effectiveEnd,
      label: `${pad2(cursor.getDate())}/${pad2(cursor.getMonth() + 1)}`,
      key: `d-${cursor.toISOString().slice(0, 10)}`,
    });
    cursor = addDays(cursor, 1);
  }
  return buckets;
}

function generateWeekBuckets(origin: Date, now: Date): BucketDef[] {
  const maxWeeks = 52;
  let cursor = startOfWeekMonday(origin);
  const buckets: BucketDef[] = [];
  while (cursor <= now) {
    const start = new Date(cursor);
    let end = endOfDay(addDays(cursor, 6));
    if (end > now) end = now;
    buckets.push({
      start,
      end,
      label: `Sem ${pad2(start.getDate())}/${pad2(start.getMonth() + 1)}`,
      key: `w-${start.toISOString().slice(0, 10)}`,
    });
    cursor = addDays(cursor, 7);
  }
  return buckets.slice(-maxWeeks);
}

function generateMonthBuckets(origin: Date, now: Date): BucketDef[] {
  const buckets: BucketDef[] = [];
  let cursor = startOfMonth(origin);
  while (cursor <= now) {
    const start = new Date(cursor);
    let end = endOfMonth(cursor);
    if (end > now) end = now;
    buckets.push({
      start,
      end,
      label: `${MONTHS_SHORT[cursor.getMonth()]}/${String(cursor.getFullYear()).slice(-2)}`,
      key: `m-${cursor.getFullYear()}-${cursor.getMonth()}`,
    });
    cursor = addMonths(cursor, 1);
  }
  return buckets;
}

function generateSemesterBuckets(origin: Date, now: Date): BucketDef[] {
  const buckets: BucketDef[] = [];
  let cursor = startOfMonth(origin);
  let index = 1;
  while (cursor <= now) {
    const start = new Date(cursor);
    let end = endOfMonth(addMonths(cursor, 5));
    if (end > now) end = now;
    const year = start.getFullYear();
    buckets.push({
      start,
      end,
      label: `S${((index - 1) % 2) + 1}/${year}`,
      key: `s-${year}-${index}`,
    });
    cursor = addMonths(cursor, 6);
    index++;
  }
  return buckets;
}

function generateYearBuckets(origin: Date, now: Date): BucketDef[] {
  const buckets: BucketDef[] = [];
  for (let y = origin.getFullYear(); y <= now.getFullYear(); y++) {
    const start = new Date(y, 0, 1);
    const originStart = y === origin.getFullYear() ? origin : start;
    let end = new Date(y, 11, 31, 23, 59, 59, 999);
    if (end > now) end = now;
    if (originStart <= now) {
      buckets.push({
        start: originStart,
        end,
        label: String(y),
        key: `y-${y}`,
      });
    }
  }
  return buckets;
}

function resolveAvailableGranularities(ageDays: number): HistoryGranularity[] {
  const all: HistoryGranularity[] = ["day", "week", "month", "semester", "year"];
  if (ageDays < 2) return ["day"];
  if (ageDays < 14) return ["day", "week"];
  if (ageDays < 60) return ["day", "week", "month"];
  if (ageDays < 365) return ["day", "week", "month", "semester"];
  return all;
}

function buildInsights(
  meta: HistoryMeta,
  lifetime: PeriodSnapshot,
  series: Record<HistoryGranularity, HistorySeries>
): string[] {
  const notes: string[] = [];
  notes.push(
    `Histórico calculado desde ${meta.originLabel} — ${meta.accountAgeLabel} de uso do Ecohub (${meta.accountAgeDays} dias).`
  );

  if (lifetime.dataPoints === 0) {
    notes.push("Ainda não há registros acadêmicos no período. Lance notas, frequência e exercícios para construir o histórico.");
    return notes;
  }

  notes.push(
    `Acumulado total: ${lifetime.gradesCount} nota(s), ${lifetime.exerciseSubmissions} entrega(s), ${lifetime.xpTotal.toLocaleString("pt-BR")} XP — saúde pedagógica ${lifetime.healthScore}/100.`
  );

  const monthly = series.month;
  if (monthly.buckets.length >= 2) {
    const last = monthly.buckets[monthly.buckets.length - 1];
    const prev = monthly.buckets[monthly.buckets.length - 2];
    if (last.healthScore > prev.healthScore) {
      notes.push(`Tendência mensal positiva: saúde pedagógica subiu de ${prev.healthScore} para ${last.healthScore} pts.`);
    } else if (last.healthScore < prev.healthScore) {
      notes.push(`Atenção: queda mensal na saúde pedagógica (${prev.healthScore} → ${last.healthScore} pts).`);
    }
  }

  const yearly = series.year;
  if (yearly.buckets.length >= 2) {
    const lastY = yearly.buckets[yearly.buckets.length - 1];
    const prevY = yearly.buckets[yearly.buckets.length - 2];
    notes.push(
      `Comparativo anual: ${lastY.label} (${lastY.averageGrade.toFixed(1)} média, ${lastY.passRate}% aprovação) vs ${prevY.label} (${prevY.averageGrade.toFixed(1)}, ${prevY.passRate}%).`
    );
  }

  return notes.slice(0, 5);
}

async function loadSchoolRawData(schoolId: string) {
  const [school, grades, attendance, xp, submissions] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { createdAt: true, name: true } }),
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

  return {
    school,
    rawGrades: grades.map((g) => ({ value: g.value, createdAt: g.createdAt, studentId: g.studentId })),
    rawAtt: attendance.map((a) => ({ status: a.status, date: a.date })),
    rawXp: xp.map((x) => ({ amount: x.amount, createdAt: x.createdAt })),
    rawSubs: submissions.map((s) => ({ createdAt: s.submittedAt })),
  };
}

function buildSeriesForGranularity(
  granularity: HistoryGranularity,
  defs: BucketDef[],
  rawGrades: RawGrade[],
  rawAtt: RawAttendance[],
  rawXp: RawXp[],
  rawSubs: RawSubmission[],
  passGrade: number
): HistorySeries {
  const buckets = defs.map((def) =>
    buildSnapshot(def.label, def.start, def.end, rawGrades, rawAtt, rawXp, rawSubs, passGrade)
  );

  let latestComparison: PeriodComparison | null = null;
  if (buckets.length >= 2) {
    const current = buckets[buckets.length - 1];
    const previous = buckets[buckets.length - 2];
    latestComparison = buildBucketComparison(granularity, current, previous);
  }

  return {
    granularity,
    granularityLabel: GRANULARITY_LABELS[granularity],
    bucketCount: buckets.length,
    buckets,
    latestComparison,
  };
}

export function getGranularityLabel(g: HistoryGranularity) {
  return GRANULARITY_LABELS[g];
}

export async function getInstitutionalHistory(schoolId: string | null): Promise<InstitutionalHistory> {
  if (!schoolId) return emptyHistory();

  const settings = await getSchoolSettings(schoolId);
  const passGrade = settings.academic.passGrade;
  const { school, rawGrades, rawAtt, rawXp, rawSubs } = await loadSchoolRawData(schoolId);

  const now = new Date();
  const origin = school?.createdAt ?? now;
  const accountAgeDays = Math.max(1, Math.ceil((now.getTime() - origin.getTime()) / 86_400_000));

  const allDates = [
    ...rawGrades.map((g) => g.createdAt),
    ...rawAtt.map((a) => a.date),
    ...rawXp.map((x) => x.createdAt),
    ...rawSubs.map((s) => s.createdAt),
  ].sort((a, b) => a.getTime() - b.getTime());

  const meta: HistoryMeta = {
    originDate: origin.toISOString(),
    originLabel: formatOriginLabel(origin),
    accountAgeDays,
    accountAgeLabel: formatAccountAge(accountAgeDays),
    firstDataDate: allDates[0]?.toISOString() ?? null,
    lastDataDate: (allDates[allDates.length - 1] ?? now).toISOString(),
    totalGrades: rawGrades.length,
    totalAttendance: rawAtt.length,
    totalXpEvents: rawXp.length,
    totalSubmissions: rawSubs.length,
  };

  const lifetime = buildSnapshot(
    "Desde a criação",
    origin,
    now,
    rawGrades,
    rawAtt,
    rawXp,
    rawSubs,
    passGrade
  );

  const series = {
    day: buildSeriesForGranularity(
      "day",
      generateDayBuckets(origin, now),
      rawGrades,
      rawAtt,
      rawXp,
      rawSubs,
      passGrade
    ),
    week: buildSeriesForGranularity(
      "week",
      generateWeekBuckets(origin, now),
      rawGrades,
      rawAtt,
      rawXp,
      rawSubs,
      passGrade
    ),
    month: buildSeriesForGranularity(
      "month",
      generateMonthBuckets(origin, now),
      rawGrades,
      rawAtt,
      rawXp,
      rawSubs,
      passGrade
    ),
    semester: buildSeriesForGranularity(
      "semester",
      generateSemesterBuckets(origin, now),
      rawGrades,
      rawAtt,
      rawXp,
      rawSubs,
      passGrade
    ),
    year: buildSeriesForGranularity(
      "year",
      generateYearBuckets(origin, now),
      rawGrades,
      rawAtt,
      rawXp,
      rawSubs,
      passGrade
    ),
  };

  return {
    meta,
    lifetime,
    series,
    availableGranularities: resolveAvailableGranularities(accountAgeDays),
    insights: buildInsights(meta, lifetime, series),
  };
}

export type StudentHistory = {
  meta: Pick<HistoryMeta, "originDate" | "originLabel" | "accountAgeDays" | "accountAgeLabel">;
  lifetime: PeriodSnapshot;
  series: Pick<InstitutionalHistory["series"], "day" | "week" | "month">;
  availableGranularities: HistoryGranularity[];
};

export async function getStudentHistory(studentId: string): Promise<StudentHistory | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { schoolId: true } },
      grades: { select: { value: true, createdAt: true, studentId: true } },
      attendance: { select: { status: true, date: true } },
      xpTransactions: { select: { amount: true, createdAt: true } },
      exerciseSubmissions: { select: { submittedAt: true } },
    },
  });

  if (!student?.user.schoolId) return null;

  const settings = await getSchoolSettings(student.user.schoolId);
  const passGrade = settings.academic.passGrade;
  const now = new Date();
  const origin = student.createdAt;
  const accountAgeDays = Math.max(1, Math.ceil((now.getTime() - origin.getTime()) / 86_400_000));

  const rawGrades: RawGrade[] = student.grades.map((g) => ({
    value: g.value,
    createdAt: g.createdAt,
    studentId: g.studentId,
  }));
  const rawAtt: RawAttendance[] = student.attendance.map((a) => ({ status: a.status, date: a.date }));
  const rawXp: RawXp[] = student.xpTransactions.map((x) => ({
    amount: x.amount,
    createdAt: x.createdAt,
  }));
  const rawSubs: RawSubmission[] = student.exerciseSubmissions.map((s) => ({
    createdAt: s.submittedAt,
  }));

  const lifetime = buildSnapshot(
    "Desde a matrícula",
    origin,
    now,
    rawGrades,
    rawAtt,
    rawXp,
    rawSubs,
    passGrade
  );

  const series = {
    day: buildSeriesForGranularity(
      "day",
      generateDayBuckets(origin, now),
      rawGrades,
      rawAtt,
      rawXp,
      rawSubs,
      passGrade
    ),
    week: buildSeriesForGranularity(
      "week",
      generateWeekBuckets(origin, now),
      rawGrades,
      rawAtt,
      rawXp,
      rawSubs,
      passGrade
    ),
    month: buildSeriesForGranularity(
      "month",
      generateMonthBuckets(origin, now),
      rawGrades,
      rawAtt,
      rawXp,
      rawSubs,
      passGrade
    ),
  };

  return {
    meta: {
      originDate: origin.toISOString(),
      originLabel: formatOriginLabel(origin),
      accountAgeDays,
      accountAgeLabel: formatAccountAge(accountAgeDays),
    },
    lifetime,
    series,
    availableGranularities: resolveAvailableGranularities(accountAgeDays).filter((g) =>
      ["day", "week", "month"].includes(g)
    ),
  };
}

function emptyHistory(): InstitutionalHistory {
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
  const emptySeries = (g: HistoryGranularity): HistorySeries => ({
    granularity: g,
    granularityLabel: GRANULARITY_LABELS[g],
    bucketCount: 0,
    buckets: [],
    latestComparison: null,
  });
  return {
    meta: {
      originDate: "",
      originLabel: "—",
      accountAgeDays: 0,
      accountAgeLabel: "—",
      firstDataDate: null,
      lastDataDate: "",
      totalGrades: 0,
      totalAttendance: 0,
      totalXpEvents: 0,
      totalSubmissions: 0,
    },
    lifetime: emptySnap,
    series: {
      day: emptySeries("day"),
      week: emptySeries("week"),
      month: emptySeries("month"),
      semester: emptySeries("semester"),
      year: emptySeries("year"),
    },
    availableGranularities: [],
    insights: ["Cadastre a instituição e lance dados para iniciar o histórico temporal."],
  };
}
