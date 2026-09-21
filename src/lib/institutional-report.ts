import { prisma } from "@/lib/db";
import { getSchoolSettings } from "@/lib/school-settings";
import { getInstitutionalOverview } from "@/lib/institutional-overview";
import { getSubjectPrecisionOverview } from "@/lib/subject-precision";
import { computeAttendanceSummary, computeOverallAverage, type GradeRow } from "@/lib/boletim";
import { studentInTeacherClassWhere } from "@/lib/teacher-classes";

export type ReportSubjectDetail = {
  subject: string;
  average: number;
  gradeCount: number;
  precisionScore: number;
  precisionLabel: string;
  studentsWithGrades: number;
  passRatePercent: number;
  configured: boolean;
};

export type ReportStudentSubject = {
  subject: string;
  average: number;
  gradeCount: number;
  periods: string;
  lastGrade: string | null;
  status: "Aprovado" | "Recuperação" | "Atenção" | "Sem notas";
};

export type ReportStudentRow = {
  studentId: string;
  name: string;
  enrollmentCode: string;
  email: string;
  className: string;
  overallAverage: number | null;
  attendanceRate: number | null;
  xpTotal: number;
  level: number;
  approvalStatus: string;
  subjectCount: number;
  subjects: ReportStudentSubject[];
};

export type ReportClassRow = {
  classId: string;
  className: string;
  studentCount: number;
  averageGrade: number;
  passRate: number;
  attendanceRate: number;
};

export type InstitutionalReport = {
  generatedAt: string;
  schoolName: string;
  passGrade: number;
  maxGrade: number;
  configuredSubjects: string[];
  accountSince: string | null;
  summary: {
    totalStudents: number;
    totalClasses: number;
    totalTeachers: number;
    averageGrade: number;
    attendanceRate: number;
    passRate: number;
    healthScore: number;
    healthLabel: string;
    totalXp: number;
    exerciseSubmissions: number;
    overallPrecision: number;
    dropoutRiskRate: number;
    bnccCoverageRate: number;
    familyEngagementIndex: number;
  };
  subjects: ReportSubjectDetail[];
  students: ReportStudentRow[];
  classes: ReportClassRow[];
  studentSubjectRows: {
    studentId: string;
    studentName: string;
    enrollmentCode: string;
    className: string;
    subject: string;
    average: number;
    gradeCount: number;
    periods: string;
    status: string;
  }[];
};

function approvalStatus(avg: number | null, passGrade: number): ReportStudentSubject["status"] {
  if (avg == null) return "Sem notas";
  if (avg >= passGrade) return "Aprovado";
  if (avg >= passGrade - 2) return "Recuperação";
  return "Atenção";
}

export async function getInstitutionalReport(
  schoolId: string | null,
  options?: { teacherId?: string; schoolName?: string }
): Promise<InstitutionalReport | null> {
  if (!schoolId) return null;

  const studentWhere = options?.teacherId
    ? { user: { schoolId }, ...studentInTeacherClassWhere(options.teacherId) }
    : { user: { schoolId } };

  const [school, settings, overview, precision, students] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, createdAt: true } }),
    getSchoolSettings(schoolId),
    getInstitutionalOverview(schoolId),
    getSubjectPrecisionOverview(schoolId),
    prisma.student.findMany({
      where: studentWhere,
      include: {
        user: { select: { fullName: true, email: true } },
        classGroup: { select: { name: true } },
        grades: { orderBy: { createdAt: "desc" } },
        attendance: { select: { status: true } },
      },
      orderBy: { user: { fullName: "asc" } },
    }),
  ]);

  const passGrade = settings.academic.passGrade;

  const subjects: ReportSubjectDetail[] = precision.entries.map((e) => ({
    subject: e.subject,
    average: e.average,
    gradeCount: e.gradeCount,
    precisionScore: e.precisionScore,
    precisionLabel: e.precisionLabel,
    studentsWithGrades: e.studentsWithGrades,
    passRatePercent: e.passRatePercent,
    configured: e.configured,
  }));

  const reportStudents: ReportStudentRow[] = students.map((s) => {
    const gradeRows: GradeRow[] = s.grades.map((g) => ({
      id: g.id,
      subject: g.subject,
      value: g.value,
      maxValue: g.maxValue,
      period: g.period,
      createdAt: g.createdAt,
    }));

    const overallAverage = computeOverallAverage(gradeRows);
    const att = computeAttendanceSummary(s.attendance);

    const subjectMap = new Map<string, typeof s.grades>();
    for (const g of s.grades) {
      const list = subjectMap.get(g.subject) ?? [];
      list.push(g);
      subjectMap.set(g.subject, list);
    }

    const subjectDetails: ReportStudentSubject[] = [...subjectMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
      .map(([subject, grades]) => {
        const avg = grades.reduce((sum, g) => sum + g.value, 0) / grades.length;
        const periods = [...new Set(grades.map((g) => g.period))].join(", ");
        const last = grades[0]?.createdAt;
        return {
          subject,
          average: Math.round(avg * 10) / 10,
          gradeCount: grades.length,
          periods,
          lastGrade: last ? last.toISOString().slice(0, 10) : null,
          status: approvalStatus(avg, passGrade),
        };
      });

    return {
      studentId: s.id,
      name: s.user.fullName,
      enrollmentCode: s.enrollmentCode,
      email: s.user.email,
      className: s.classGroup?.name ?? "Sem turma",
      overallAverage: overallAverage != null ? Math.round(overallAverage * 10) / 10 : null,
      attendanceRate: att?.rate ?? null,
      xpTotal: s.xpTotal,
      level: s.level,
      approvalStatus: approvalStatus(overallAverage, passGrade),
      subjectCount: subjectDetails.length,
      subjects: subjectDetails,
    };
  });

  const studentSubjectRows = reportStudents.flatMap((s) =>
    s.subjects.map((sub) => ({
      studentId: s.studentId,
      studentName: s.name,
      enrollmentCode: s.enrollmentCode,
      className: s.className,
      subject: sub.subject,
      average: sub.average,
      gradeCount: sub.gradeCount,
      periods: sub.periods,
      status: sub.status,
    }))
  );

  // Executive KPIs
  const studentsAtRisk = reportStudents.filter((s) => {
    const lowAttendance = s.attendanceRate !== null && s.attendanceRate < 75;
    const lowAverage = s.overallAverage !== null && s.overallAverage < Math.max(1, passGrade - 2);
    return lowAttendance || lowAverage;
  }).length;
  const dropoutRiskRate = reportStudents.length > 0 ? Math.round((studentsAtRisk / reportStudents.length) * 100) : 0;

  const [totalExercisesCount, completedExerciseSubmissions, totalTrailsCount, completedTrailSteps, totalParentLinks, readAnnouncementsCount] = await Promise.all([
    prisma.exercise.count({ where: { schoolId } }),
    prisma.exerciseSubmission.count({ where: { exercise: { schoolId } } }),
    prisma.learningTrail.count({ where: { schoolId } }),
    prisma.studentTrailProgress.count({ where: { trail: { schoolId } } }),
    prisma.parentStudent.count({ where: { student: { user: { schoolId } } } }),
    prisma.announcementRead.count({ where: { announcement: { schoolId } } }),
  ]);

  const totalPlannedActivities = totalExercisesCount + totalTrailsCount || 1;
  const totalCompletedActivities = completedExerciseSubmissions + completedTrailSteps;
  const bnccCoverageRate = Math.min(
    100,
    Math.round((totalCompletedActivities / (totalPlannedActivities * Math.max(1, overview.totalStudents))) * 100)
  );

  const familyEngagementIndex = totalParentLinks > 0
    ? Math.min(100, Math.round((readAnnouncementsCount / Math.max(1, totalParentLinks * 2)) * 100))
    : 0;

  const classes: ReportClassRow[] = overview.classes
    .filter((c) => {
      if (!options?.teacherId) return true;
      return reportStudents.some((s) => s.className === c.className);
    })
    .map((c) => ({
      classId: c.classId,
      className: c.className,
      studentCount: c.studentCount,
      averageGrade: c.averageGrade,
      passRate: c.passRate,
      attendanceRate: c.attendanceRate,
    }));

  return {
    generatedAt: new Date().toISOString(),
    schoolName: options?.schoolName ?? school?.name ?? "Instituição",
    passGrade,
    maxGrade: settings.academic.maxGrade,
    configuredSubjects: settings.academic.subjects,
    accountSince: school?.createdAt.toISOString() ?? null,
    summary: {
      totalStudents: overview.totalStudents,
      totalClasses: overview.totalClasses,
      totalTeachers: overview.totalTeachers,
      averageGrade: overview.averageGrade,
      attendanceRate: overview.attendanceRate,
      passRate: overview.passRate,
      healthScore: overview.healthScore,
      healthLabel: overview.healthLabel,
      totalXp: overview.totalXpAwarded,
      exerciseSubmissions: overview.exerciseSubmissions,
      overallPrecision: precision.overallPrecision,
      dropoutRiskRate,
      bnccCoverageRate,
      familyEngagementIndex,
    },
    subjects,
    students: reportStudents,
    classes,
    studentSubjectRows,
  };
}
