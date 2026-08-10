import { prisma } from "@/lib/db";
import { getSchoolSettings } from "@/lib/school-settings";

export type RiskAlert = {
  id: string;
  severity: "high" | "medium";
  title: string;
  message: string;
  href: string;
  studentId?: string;
};

export async function computeRiskAlerts(schoolId: string): Promise<RiskAlert[]> {
  const settings = await getSchoolSettings(schoolId);
  const passGrade = settings.academic.passGrade;
  const alerts: RiskAlert[] = [];

  const students = await prisma.student.findMany({
    where: { user: { schoolId } },
    include: {
      user: { select: { fullName: true } },
      grades: { select: { value: true } },
      attendance: { orderBy: { date: "desc" }, take: 30 },
      classGroup: { select: { name: true } },
    },
  });

  for (const s of students) {
    const avg =
      s.grades.length > 0 ? s.grades.reduce((a, g) => a + g.value, 0) / s.grades.length : null;
    const absences = s.attendance.filter((a) => a.status === "absent").length;
    const total = s.attendance.length;
    const freq = total > 0 ? ((total - absences) / total) * 100 : 100;

    if (avg != null && avg < passGrade - 1) {
      alerts.push({
        id: `grade-${s.id}`,
        severity: avg < passGrade - 2 ? "high" : "medium",
        title: "Nota abaixo da média",
        message: `${s.user.fullName} (${s.classGroup?.name ?? "—"}): média ${avg.toFixed(1)}`,
        href: `/dashboard/alunos/${s.id}`,
        studentId: s.id,
      });
    }

    if (total >= 5 && freq < 75) {
      alerts.push({
        id: `freq-${s.id}`,
        severity: freq < 60 ? "high" : "medium",
        title: "Frequência crítica",
        message: `${s.user.fullName}: ${Math.round(freq)}% de presença nos últimos registros`,
        href: `/dashboard/alunos/${s.id}`,
        studentId: s.id,
      });
    }

    const recentAbsences = s.attendance.slice(0, 5).filter((a) => a.status === "absent").length;
    if (recentAbsences >= 3) {
      alerts.push({
        id: `streak-${s.id}`,
        severity: "high",
        title: "Faltas consecutivas recentes",
        message: `${s.user.fullName}: ${recentAbsences} faltas nos últimos 5 dias registrados`,
        href: `/dashboard/responsavel/filho/${s.id}`,
        studentId: s.id,
      });
    }
  }

  return alerts.sort((a, b) => (a.severity === "high" ? -1 : 1));
}
