import { prisma } from "@/lib/db";
import { getSchoolSettings } from "@/lib/school-settings";

export type DropoutRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface StudentDropoutRiskAssessment {
  studentId: string;
  studentName: string;
  enrollmentCode: string;
  classId?: string | null;
  className?: string | null;
  score: number; // 0 - 100
  level: DropoutRiskLevel;
  factors: string[];
  attendanceMetrics: {
    totalRecords: number;
    absencesLast15Days: number;
    absencesLast30Days: number;
    consecutiveAbsences: number;
    attendanceRatePercent: number;
  };
  performanceMetrics: {
    averageGrade: number;
    passGrade: number;
    hasGradeDropTrend: boolean;
    failingSubjectsCount: number;
  };
  engagementMetrics: {
    pendingOverdueExercisesCount: number;
  };
  assessedAt: Date;
}

export function determineRiskLevel(score: number): DropoutRiskLevel {
  if (score >= 76) return "CRITICAL";
  if (score >= 51) return "HIGH";
  if (score >= 26) return "MEDIUM";
  return "LOW";
}

export async function calculateStudentDropoutRisk(
  studentId: string,
  schoolId: string
): Promise<StudentDropoutRiskAssessment | null> {
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      user: { schoolId },
    },
    include: {
      user: { select: { fullName: true, schoolId: true } },
      classGroup: { select: { id: true, name: true } },
      attendance: {
        orderBy: { date: "desc" },
        take: 60,
      },
      grades: true,
      exerciseSubmissions: {
        select: { exerciseId: true },
      },
    },
  });

  if (!student) return null;

  const settings = await getSchoolSettings(schoolId);
  const passGrade = settings.academic?.passGrade ?? 6.0;

  const now = new Date();
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 1. Frequência (Peso 45%)
  const totalAttendanceRecords = student.attendance.length;
  let absencesLast15Days = 0;
  let absencesLast30Days = 0;
  let consecutiveAbsences = 0;
  let countingConsecutive = true;
  let presentOrLateCount = 0;

  for (const record of student.attendance) {
    if (record.status === "absent" && !record.justificationNote) {
      if (record.date >= fifteenDaysAgo) absencesLast15Days++;
      if (record.date >= thirtyDaysAgo) absencesLast30Days++;
      if (countingConsecutive) consecutiveAbsences++;
    } else {
      countingConsecutive = false;
      if (record.status === "present" || record.status === "late") {
        presentOrLateCount++;
      }
    }
  }

  const attendanceRatePercent =
    totalAttendanceRecords > 0
      ? Math.round((presentOrLateCount / totalAttendanceRecords) * 100)
      : 100;

  let attendanceRiskScore = 0;
  const factors: string[] = [];

  if (consecutiveAbsences >= 3) {
    attendanceRiskScore += 40;
    factors.push(`${consecutiveAbsences} faltas não justificadas consecutivas recentes`);
  } else if (consecutiveAbsences === 2) {
    attendanceRiskScore += 20;
    factors.push("2 faltas consecutivas sem justificativa");
  }

  if (absencesLast15Days >= 3) {
    attendanceRiskScore += 35;
    factors.push(`${absencesLast15Days} faltas nos últimos 15 dias`);
  } else if (absencesLast30Days >= 5) {
    attendanceRiskScore += 25;
    factors.push(`${absencesLast30Days} faltas no último mês`);
  }

  if (attendanceRatePercent < 75) {
    attendanceRiskScore += 25;
    factors.push(`Frequência global abaixo do limite legal (${attendanceRatePercent}%)`);
  }
  attendanceRiskScore = Math.min(100, attendanceRiskScore);

  // 2. Rendimento / Notas (Peso 35%)
  let performanceRiskScore = 0;
  const grades = student.grades;
  const averageGrade =
    grades.length > 0 ? grades.reduce((sum, g) => sum + g.value, 0) / grades.length : passGrade;

  const failingGrades = grades.filter((g) => g.value < passGrade);
  const failingSubjectsCount = new Set(failingGrades.map((g) => g.subject)).size;

  if (failingSubjectsCount >= 3) {
    performanceRiskScore += 45;
    factors.push(`Nota abaixo da média (${passGrade}) em ${failingSubjectsCount} disciplinas`);
  } else if (failingSubjectsCount > 0) {
    performanceRiskScore += 25;
    factors.push(`Nota abaixo da média (${passGrade}) em ${failingSubjectsCount} disciplina(s)`);
  }

  // Tendência de queda entre bimestres
  let hasGradeDropTrend = false;
  const gradesByPeriod: Record<string, number[]> = {};
  grades.forEach((g) => {
    if (!gradesByPeriod[g.period]) gradesByPeriod[g.period] = [];
    gradesByPeriod[g.period].push(g.value);
  });
  const periodKeys = Object.keys(gradesByPeriod).sort();
  if (periodKeys.length >= 2) {
    const pPrev = gradesByPeriod[periodKeys[periodKeys.length - 2]];
    const pCurr = gradesByPeriod[periodKeys[periodKeys.length - 1]];
    const avgPrev = pPrev.reduce((a, b) => a + b, 0) / pPrev.length;
    const avgCurr = pCurr.reduce((a, b) => a + b, 0) / pCurr.length;

    if (avgPrev > 0 && (avgPrev - avgCurr) / avgPrev >= 0.25) {
      hasGradeDropTrend = true;
      performanceRiskScore += 35;
      factors.push(
        `Queda > 25% na média no último período (${avgPrev.toFixed(1)} -> ${avgCurr.toFixed(1)})`
      );
    }
  }
  performanceRiskScore = Math.min(100, performanceRiskScore);

  // 3. Engajamento / Exercícios Pendentes (Peso 20%)
  let engagementRiskScore = 0;
  const submittedExerciseIds = new Set(student.exerciseSubmissions.map((s) => s.exerciseId));

  const assignedExercises = await prisma.exercise.findMany({
    where: {
      schoolId,
      isActive: true,
      dueDate: { lt: now },
      OR: [
        { classId: student.classId ?? undefined },
        { studentTargets: { some: { studentId: student.id } } },
      ],
    },
    select: { id: true, title: true, dueDate: true },
    take: 20,
  });

  const pendingOverdueExercises = assignedExercises.filter((e) => !submittedExerciseIds.has(e.id));
  const pendingOverdueExercisesCount = pendingOverdueExercises.length;

  if (pendingOverdueExercisesCount >= 4) {
    engagementRiskScore += 50;
    factors.push(`${pendingOverdueExercisesCount} tarefas/exercícios pendentes e atrasados`);
  } else if (pendingOverdueExercisesCount >= 2) {
    engagementRiskScore += 30;
    factors.push(`${pendingOverdueExercisesCount} exercícios não entregues com prazo vencido`);
  }
  engagementRiskScore = Math.min(100, engagementRiskScore);

  // Score Consolidado Ponderado (Frequência 45%, Rendimento 35%, Engajamento 20%)
  const score = Math.round(
    attendanceRiskScore * 0.45 + performanceRiskScore * 0.35 + engagementRiskScore * 0.2
  );

  const level = determineRiskLevel(score);

  return {
    studentId: student.id,
    studentName: student.user.fullName,
    enrollmentCode: student.enrollmentCode,
    classId: student.classId,
    className: student.classGroup?.name,
    score,
    level,
    factors,
    attendanceMetrics: {
      totalRecords: totalAttendanceRecords,
      absencesLast15Days,
      absencesLast30Days,
      consecutiveAbsences,
      attendanceRatePercent,
    },
    performanceMetrics: {
      averageGrade: Number(averageGrade.toFixed(1)),
      passGrade,
      hasGradeDropTrend,
      failingSubjectsCount,
    },
    engagementMetrics: {
      pendingOverdueExercisesCount,
    },
    assessedAt: now,
  };
}
