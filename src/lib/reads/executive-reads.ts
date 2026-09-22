import { prisma } from "@/lib/db";
import { getSchoolSettings } from "@/lib/school-settings";

export interface AtRiskStudentItem {
  id: string;
  name: string;
  className: string;
  attendanceRatePercent: number;
  averageGrade: number;
  severity: "CRITICAL" | "ALERT";
  reasons: string[];
}

export interface ExecutiveDashboardData {
  finance: {
    paidCurrentMonthCents: number;
    overdueTotalCents: number;
    overdueCount: number;
    delinquencyRatePercent: number;
  };
  attendance: {
    average30DaysPercent: number;
  };
  atRiskStudents: AtRiskStudentItem[];
  atRiskCount: number;
}

export async function getExecutiveDashboardData(
  schoolId: string
): Promise<ExecutiveDashboardData> {
  const settings = await getSchoolSettings(schoolId);
  const passGrade = settings.academic?.passGrade ?? 6.0;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 1. Financeiro (StudentInvoice + Invoice)
  const paidInvoicesCurrentMonth = await prisma.studentInvoice.aggregate({
    where: {
      schoolId,
      status: "PAID",
      paidAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    _sum: { amountCents: true },
  });

  const overdueInvoices = await prisma.studentInvoice.findMany({
    where: {
      schoolId,
      OR: [
        { status: "OVERDUE" },
        { status: "PENDING", dueDate: { lt: now } },
      ],
    },
    select: { amountCents: true },
  });

  const totalInvoicedCurrentMonth = await prisma.studentInvoice.aggregate({
    where: {
      schoolId,
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    _sum: { amountCents: true },
  });

  const paidCurrentMonthCents = paidInvoicesCurrentMonth._sum.amountCents ?? 0;
  const overdueTotalCents = overdueInvoices.reduce((acc, inv) => acc + inv.amountCents, 0);
  const overdueCount = overdueInvoices.length;

  const totalBilledCents = (totalInvoicedCurrentMonth._sum.amountCents ?? 0) + overdueTotalCents;
  const delinquencyRatePercent =
    totalBilledCents > 0
      ? Math.min(100, Math.round((overdueTotalCents / totalBilledCents) * 100))
      : 0;

  // 2. Frequência Média Escolar dos últimos 30 dias
  const attendance30Days = await prisma.attendance.findMany({
    where: {
      classGroup: { schoolId },
      date: { gte: thirtyDaysAgo },
    },
    select: { status: true },
  });

  let average30DaysPercent = 100;
  if (attendance30Days.length > 0) {
    const presentOrLate = attendance30Days.filter(
      (a) => a.status === "present" || a.status === "late"
    ).length;
    average30DaysPercent = Math.round((presentOrLate / attendance30Days.length) * 100);
  }

  // 3. Estudantes em Risco
  const students = await prisma.student.findMany({
    where: {
      user: { schoolId },
      status: "active",
    },
    include: {
      user: { select: { fullName: true } },
      classGroup: { select: { name: true } },
      attendance: {
        where: { date: { gte: thirtyDaysAgo } },
        select: { status: true },
      },
      grades: {
        select: { value: true },
      },
    },
  });

  const atRiskStudents: AtRiskStudentItem[] = [];

  for (const s of students) {
    const totalAtt = s.attendance.length;
    const presentCount = s.attendance.filter(
      (a) => a.status === "present" || a.status === "late"
    ).length;
    const attendanceRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 100;

    const grades = s.grades;
    const avgGrade =
      grades.length > 0
        ? Number((grades.reduce((acc, g) => acc + g.value, 0) / grades.length).toFixed(1))
        : passGrade;

    const reasons: string[] = [];
    if (attendanceRate < 75) {
      reasons.push(`Frequência nos últimos 30 dias: ${attendanceRate}% (< 75%)`);
    }
    if (avgGrade < passGrade) {
      reasons.push(`Média de notas: ${avgGrade.toFixed(1)} (< ${passGrade.toFixed(1)})`);
    }

    if (reasons.length > 0) {
      const severity: "CRITICAL" | "ALERT" =
        attendanceRate < 60 || avgGrade < passGrade - 1.5 || reasons.length > 1
          ? "CRITICAL"
          : "ALERT";

      atRiskStudents.push({
        id: s.id,
        name: s.user.fullName,
        className: s.classGroup?.name ?? "Sem Turma",
        attendanceRatePercent: attendanceRate,
        averageGrade: avgGrade,
        severity,
        reasons,
      });
    }
  }

  // Ordenar alunos em risco com severidade CRITICAL no topo
  atRiskStudents.sort((a, b) => {
    if (a.severity === "CRITICAL" && b.severity !== "CRITICAL") return -1;
    if (a.severity !== "CRITICAL" && b.severity === "CRITICAL") return 1;
    return a.attendanceRatePercent - b.attendanceRatePercent;
  });

  return {
    finance: {
      paidCurrentMonthCents,
      overdueTotalCents,
      overdueCount,
      delinquencyRatePercent,
    },
    attendance: {
      average30DaysPercent,
    },
    atRiskStudents,
    atRiskCount: atRiskStudents.length,
  };
}
