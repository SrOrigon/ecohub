import type { AttendanceStatus } from "@/lib/constants";
import { ATTENDANCE_LABELS } from "@/lib/constants";

export type GradeRow = {
  id: string;
  subject: string;
  value: number;
  maxValue: number;
  period: string;
  createdAt: Date | string;
};

export function gradeVariant(value: number, passGrade: number, maxValue = 10) {
  const normalized = maxValue > 0 ? (value / maxValue) * 10 : value;
  const passNorm = (passGrade / 10) * 10;
  if (normalized >= passGrade) return "success" as const;
  if (normalized >= passGrade - 2) return "warning" as const;
  return "danger" as const;
}

export function formatGradeDisplay(value: number, maxValue: number, schoolMax = 10) {
  if (maxValue === schoolMax) return value.toFixed(1);
  return `${value.toFixed(1)}/${maxValue.toFixed(0)}`;
}

export function sortPeriods(periods: string[], schoolPeriods: string[]) {
  const order = new Map(schoolPeriods.map((p, i) => [p, i]));
  return [...periods].sort((a, b) => {
    const ia = order.get(a) ?? 999;
    const ib = order.get(b) ?? 999;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b, "pt-BR");
  });
}

export function buildSubjectMatrix(grades: GradeRow[], periods: string[]) {
  const subjects = [...new Set(grades.map((g) => g.subject))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  return subjects.map((subject) => {
    const subjectGrades = grades.filter((g) => g.subject === subject);
    const byPeriod = Object.fromEntries(
      periods.map((p) => {
        const g = subjectGrades.find((gr) => gr.period === p);
        return [p, g ?? null];
      })
    );
    const avg =
      subjectGrades.length > 0
        ? subjectGrades.reduce((s, g) => s + g.value, 0) / subjectGrades.length
        : null;
    return { subject, byPeriod, avg, grades: subjectGrades };
  });
}

export function computeOverallAverage(grades: GradeRow[]) {
  if (grades.length === 0) return null;
  return grades.reduce((s, g) => s + g.value, 0) / grades.length;
}

export function computeAttendanceSummary(
  records: { status: string }[]
): {
  total: number;
  present: number;
  absent: number;
  late: number;
  justified: number;
  rate: number;
} | null {
  if (records.length === 0) return null;
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;
  const justified = records.filter((r) => r.status === "justified").length;
  const effective = present + late + justified;
  return {
    total: records.length,
    present,
    absent,
    late,
    justified,
    rate: Math.round((effective / records.length) * 100),
  };
}

export function attendanceStatusLabel(status: string) {
  return ATTENDANCE_LABELS[status as AttendanceStatus] ?? status;
}

export function approvalLabel(avg: number | null, passGrade: number) {
  if (avg == null) return { label: "Sem notas", tone: "muted" as const };
  if (avg >= passGrade) return { label: "Aprovado", tone: "success" as const };
  if (avg >= passGrade - 2) return { label: "Recuperação", tone: "warning" as const };
  return { label: "Atenção", tone: "danger" as const };
}
