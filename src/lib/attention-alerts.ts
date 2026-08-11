import { prisma } from "@/lib/db";
import { getSchoolSettings } from "@/lib/school-settings";
import type { SessionUser } from "@/lib/auth";
import { studentInTeacherClassWhere } from "@/lib/teacher-classes";
import { getStudentExerciseStatus } from "@/components/exercises/exercise-status-badge";

export type AttentionAlertSeverity = "critical" | "high" | "medium" | "low";

export type AttentionAlertKind =
  | "subject_grade"
  | "overall_grade"
  | "attendance"
  | "absence_streak"
  | "exercise_deadline"
  | "exercise_overdue"
  | "mission_deadline"
  | "occurrence";

export type AttentionAlert = {
  id: string;
  severity: AttentionAlertSeverity;
  kind: AttentionAlertKind;
  title: string;
  message: string;
  detail?: string;
  studentId: string;
  studentName: string;
  className: string;
  subject?: string;
  deadline?: string;
  deadlineLabel?: string;
  href: string;
  actionRequired: string;
  detectedAt: string;
};

export type AttentionAlertsSummary = {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byStudent: Record<string, number>;
};

export type AttentionAlertsSnapshot = {
  version: string;
  updatedAt: string;
  alerts: AttentionAlert[];
  summary: AttentionAlertsSummary;
};

type Audience = "parent" | "staff" | "student";

const SEVERITY_ORDER: Record<AttentionAlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function startOfDay(d = new Date()) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysUntil(date: Date) {
  const today = startOfDay();
  const target = startOfDay(date);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function formatDeadlineLabel(dueDate: Date): string {
  const diff = daysUntil(dueDate);
  if (diff < 0) {
    const overdue = Math.abs(diff);
    return overdue === 1 ? "Atrasado há 1 dia" : `Atrasado há ${overdue} dias`;
  }
  if (diff === 0) return "Vence hoje";
  if (diff === 1) return "Vence amanhã";
  return `Vence em ${diff} dias`;
}

function deadlineSeverity(dueDate: Date, overdueKind: "critical" | "high"): AttentionAlertSeverity {
  const diff = daysUntil(dueDate);
  if (diff < 0) return overdueKind;
  if (diff === 0) return "critical";
  if (diff <= 2) return "high";
  if (diff <= 7) return "medium";
  return "low";
}

function studentHref(studentId: string, audience: Audience) {
  if (audience === "parent" || audience === "student") {
    return audience === "parent"
      ? `/dashboard/responsavel/filho/${studentId}`
      : `/dashboard/aluno`;
  }
  return `/dashboard/alunos/${studentId}`;
}

function buildSummary(alerts: AttentionAlert[]): AttentionAlertsSummary {
  const summary: AttentionAlertsSummary = {
    total: alerts.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    byStudent: {},
  };

  for (const alert of alerts) {
    summary[alert.severity] += 1;
    summary.byStudent[alert.studentId] = (summary.byStudent[alert.studentId] ?? 0) + 1;
  }

  return summary;
}

function buildVersion(alerts: AttentionAlert[]) {
  return alerts
    .slice(0, 20)
    .map((a) => `${a.id}:${a.severity}`)
    .join("|");
}

function sortAlerts(alerts: AttentionAlert[]) {
  return alerts.sort((a, b) => {
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sev !== 0) return sev;
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    return a.studentName.localeCompare(b.studentName, "pt-BR");
  });
}

async function resolveStudentIds(user: SessionUser): Promise<string[] | null> {
  if (!user.schoolId) return [];

  if (user.role === "parent") {
    const links = await prisma.parentStudent.findMany({
      where: { parentId: user.id },
      select: { studentId: true },
    });
    return links.map((l) => l.studentId);
  }

  if (user.role === "student") {
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    return student ? [student.id] : [];
  }

  if (user.role === "teacher") {
    const students = await prisma.student.findMany({
      where: { user: { schoolId: user.schoolId }, ...studentInTeacherClassWhere(user.id) },
      select: { id: true },
    });
    return students.map((s) => s.id);
  }

  if (["admin", "director", "secretary"].includes(user.role)) {
    return null;
  }

  return [];
}

export async function computeAttentionAlerts(
  schoolId: string,
  options?: {
    studentIds?: string[];
    audience?: Audience;
  }
): Promise<AttentionAlert[]> {
  const settings = await getSchoolSettings(schoolId);
  const passGrade = settings.academic.passGrade;
  const audience = options?.audience ?? "staff";
  const now = new Date();
  const detectedAt = now.toISOString();
  const alerts: AttentionAlert[] = [];

  const studentWhere = {
    user: { schoolId },
    ...(options?.studentIds?.length ? { id: { in: options.studentIds } } : {}),
  };

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      user: { select: { fullName: true } },
      classGroup: { select: { name: true, id: true } },
      grades: { select: { id: true, subject: true, value: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      attendance: { orderBy: { date: "desc" }, take: 30 },
      studentMissions: {
        where: { completedAt: null },
        include: {
          mission: {
            select: { id: true, title: true, dueDate: true, isActive: true },
          },
        },
      },
      occurrences: {
        where: {
          date: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
          kind: { in: ["warning", "disciplinary"] },
        },
        orderBy: { date: "desc" },
        take: 5,
      },
    },
  });

  const classIds = [...new Set(students.map((s) => s.classId).filter((id): id is string => Boolean(id)))];

  const exercises =
    classIds.length > 0
      ? await prisma.exercise.findMany({
          where: {
            schoolId,
            isActive: true,
            classId: { in: classIds },
          },
          select: {
            id: true,
            title: true,
            classId: true,
            dueDate: true,
            submissions: {
              where: { studentId: { in: students.map((s) => s.id) } },
              select: { studentId: true, status: true, submittedAt: true },
            },
          },
        })
      : [];

  const exercisesByClass = new Map<string, typeof exercises>();
  for (const ex of exercises) {
    if (!ex.classId) continue;
    const list = exercisesByClass.get(ex.classId) ?? [];
    list.push(ex);
    exercisesByClass.set(ex.classId, list);
  }

  for (const student of students) {
    const studentName = student.user.fullName;
    const className = student.classGroup?.name ?? "Sem turma";
    const href = studentHref(student.id, audience);

    const gradesBySubject = new Map<string, number[]>();
    for (const grade of student.grades) {
      const list = gradesBySubject.get(grade.subject) ?? [];
      list.push(grade.value);
      gradesBySubject.set(grade.subject, list);
    }

    for (const [subject, values] of gradesBySubject) {
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      const latest = values[0];
      if (latest < passGrade - 2 || avg < passGrade - 1) {
        const severity: AttentionAlertSeverity =
          latest < passGrade - 2 || avg < passGrade - 2
            ? "critical"
            : avg < passGrade - 1
              ? "high"
              : "medium";
        alerts.push({
          id: `subject-${student.id}-${subject}`,
          severity,
          kind: "subject_grade",
          title: "Desempenho crítico na matéria",
          message: `${studentName}: ${subject} com média ${avg.toFixed(1)}`,
          detail: `Última nota: ${latest.toFixed(1)} · Mínimo esperado: ${passGrade.toFixed(1)}`,
          studentId: student.id,
          studentName,
          className,
          subject,
          href,
          actionRequired: "Converse com o professor e acompanhe reforço nesta matéria.",
          detectedAt,
        });
      }
    }

    const avgOverall =
      student.grades.length > 0
        ? student.grades.reduce((s, g) => s + g.value, 0) / student.grades.length
        : null;

    if (avgOverall != null && avgOverall < passGrade - 1) {
      alerts.push({
        id: `overall-${student.id}`,
        severity: avgOverall < passGrade - 2 ? "critical" : "high",
        kind: "overall_grade",
        title: "Média geral abaixo do esperado",
        message: `${studentName} (${className}): média ${avgOverall.toFixed(1)}`,
        detail: `Mínimo institucional: ${passGrade.toFixed(1)}`,
        studentId: student.id,
        studentName,
        className,
        href,
        actionRequired: "Revise o boletim e combine um plano de recuperação.",
        detectedAt,
      });
    }

    const absences = student.attendance.filter((a) => a.status === "absent").length;
    const totalAttendance = student.attendance.length;
    const freq =
      totalAttendance > 0 ? ((totalAttendance - absences) / totalAttendance) * 100 : 100;

    if (totalAttendance >= 5 && freq < 75) {
      alerts.push({
        id: `freq-${student.id}`,
        severity: freq < 60 ? "critical" : freq < 70 ? "high" : "medium",
        kind: "attendance",
        title: "Frequência abaixo do recomendado",
        message: `${studentName}: ${Math.round(freq)}% de presença nos últimos registros`,
        detail: `${absences} falta(s) em ${totalAttendance} registros recentes`,
        studentId: student.id,
        studentName,
        className,
        href,
        actionRequired: "Verifique faltas no diário e justifique ausências quando necessário.",
        detectedAt,
      });
    }

    const recentAbsences = student.attendance.slice(0, 5).filter((a) => a.status === "absent").length;
    if (recentAbsences >= 3) {
      alerts.push({
        id: `streak-${student.id}`,
        severity: "critical",
        kind: "absence_streak",
        title: "Sequência de faltas recentes",
        message: `${studentName}: ${recentAbsences} faltas nos últimos 5 dias registrados`,
        studentId: student.id,
        studentName,
        className,
        href,
        actionRequired: "Entre em contato com a escola e regularize a frequência.",
        detectedAt,
      });
    }

    const classExercises = student.classId ? exercisesByClass.get(student.classId) ?? [] : [];
    for (const exercise of classExercises) {
      const submission = exercise.submissions.find((s) => s.studentId === student.id);
      const status = getStudentExerciseStatus(
        submission,
        exercise.dueDate,
        Boolean(submission?.submittedAt)
      );

      if (status === "overdue") {
        alerts.push({
          id: `ex-overdue-${student.id}-${exercise.id}`,
          severity: "critical",
          kind: "exercise_overdue",
          title: "Exercício com prazo encerrado",
          message: `${studentName} não entregou: ${exercise.title}`,
          studentId: student.id,
          studentName,
          className,
          deadline: exercise.dueDate?.toISOString(),
          deadlineLabel: exercise.dueDate ? formatDeadlineLabel(exercise.dueDate) : "Prazo encerrado",
          href: `${href}#exercicios`,
          actionRequired: "Oriente a entrega ou fale com o professor sobre recuperação.",
          detectedAt,
        });
      } else if (status === "pending" && exercise.dueDate) {
        const severity = deadlineSeverity(exercise.dueDate, "high");
        if (severity !== "low") {
          alerts.push({
            id: `ex-due-${student.id}-${exercise.id}`,
            severity,
            kind: "exercise_deadline",
            title: "Prazo de exercício se aproximando",
            message: `${studentName}: ${exercise.title}`,
            studentId: student.id,
            studentName,
            className,
            deadline: exercise.dueDate.toISOString(),
            deadlineLabel: formatDeadlineLabel(exercise.dueDate),
            href: `${href}#exercicios`,
            actionRequired: "Acompanhe a conclusão antes do prazo final.",
            detectedAt,
          });
        }
      }
    }

    for (const sm of student.studentMissions) {
      if (!sm.mission.isActive || !sm.mission.dueDate) continue;
      const dueDate = sm.mission.dueDate;
      const severity = deadlineSeverity(dueDate, "critical");
      if (severity === "low") continue;

      alerts.push({
        id: `mission-${student.id}-${sm.missionId}`,
        severity,
        kind: "mission_deadline",
        title: daysUntil(dueDate) < 0 ? "Missão com prazo vencido" : "Prazo de missão se aproximando",
        message: `${studentName}: ${sm.mission.title}`,
        studentId: student.id,
        studentName,
        className,
        deadline: dueDate.toISOString(),
        deadlineLabel: formatDeadlineLabel(dueDate),
        href: `${href}#missoes`,
        actionRequired: "Incentive a conclusão da missão dentro do prazo.",
        detectedAt,
      });
    }

    for (const occ of student.occurrences) {
      alerts.push({
        id: `occ-${occ.id}`,
        severity: occ.kind === "disciplinary" ? "high" : "medium",
        kind: "occurrence",
        title: occ.kind === "disciplinary" ? "Ocorrência disciplinar" : "Ocorrência de alerta",
        message: `${studentName}: registro no diário de classe`,
        detail: occ.description.slice(0, 120),
        studentId: student.id,
        studentName,
        className,
        href,
        actionRequired: "Leia o registro completo e alinhe conduta com o estudante.",
        detectedAt: occ.date.toISOString(),
      });
    }
  }

  return sortAlerts(alerts);
}

export async function getAttentionAlertsSnapshot(user: SessionUser): Promise<AttentionAlertsSnapshot> {
  const empty: AttentionAlertsSnapshot = {
    version: "0",
    updatedAt: new Date().toISOString(),
    alerts: [],
    summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, byStudent: {} },
  };

  if (!user.schoolId) return empty;

  const studentIds = await resolveStudentIds(user);
  if (studentIds && studentIds.length === 0) return empty;

  const audience: Audience =
    user.role === "parent" ? "parent" : user.role === "student" ? "student" : "staff";

  const alerts = await computeAttentionAlerts(user.schoolId, {
    studentIds: studentIds ?? undefined,
    audience,
  });

  return {
    version: buildVersion(alerts),
    updatedAt: new Date().toISOString(),
    alerts,
    summary: buildSummary(alerts),
  };
}

export async function getAttentionAlertsForParent(parentId: string, schoolId: string) {
  const links = await prisma.parentStudent.findMany({
    where: { parentId },
    select: { studentId: true },
  });
  const studentIds = links.map((l) => l.studentId);
  if (studentIds.length === 0) {
    return {
      version: "0",
      updatedAt: new Date().toISOString(),
      alerts: [],
      summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, byStudent: {} },
    } satisfies AttentionAlertsSnapshot;
  }

  const alerts = await computeAttentionAlerts(schoolId, { studentIds, audience: "parent" });
  return {
    version: buildVersion(alerts),
    updatedAt: new Date().toISOString(),
    alerts,
    summary: buildSummary(alerts),
  };
}
