import type { SchoolSettings } from "@/lib/school-settings";

type GradeRow = { subject: string; value: number; period: string };

export function weightedAverage(grades: GradeRow[], settings: SchoolSettings): number {
  if (grades.length === 0) return 0;
  const weights = settings.gradeRules.subjectWeights;
  let sum = 0;
  let wSum = 0;
  for (const g of grades) {
    const w = weights[g.subject] ?? 1;
    sum += g.value * w;
    wSum += w;
  }
  return wSum > 0 ? sum / wSum : 0;
}

export function isPeriodClosed(period: string, settings: SchoolSettings): boolean {
  return settings.gradeRules.closedPeriods.includes(period);
}

export function applyRecovery(original: number, recovery: number, settings: SchoolSettings): number {
  if (!settings.gradeRules.recoveryEnabled) return original;
  return Math.max(original, (original + recovery) / 2);
}
