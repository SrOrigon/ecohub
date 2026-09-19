import { prisma } from "@/lib/db";
import { cache } from "react";
import type { SessionUser } from "@/lib/auth";
import { teacherClassWhere } from "@/lib/teacher-classes";
import { activeEnrollmentWhere, studentInClassFilter } from "@/lib/student-enrollments";
import { CACHE_TTL, cacheGetOrSet } from "@/lib/runtime-cache";
import { sortByTextPt, sortStudentsByName, sortTeachersByName } from "@/lib/sort-order";

export const getDashboardStats = cache(async (schoolId: string | null) => {
  const empty = {
    totalStudents: 0,
    totalClasses: 0,
    averageGrade: 0,
    attendanceRate: 0,
    activeMissions: 0,
    totalXpAwarded: 0,
  };
  if (!schoolId) return empty;

  try {
    return await cacheGetOrSet(`school:${schoolId}:stats`, CACHE_TTL.dashboardStats, async () => {
    const [students, classes, gradeAgg, attendanceGroups, activeMissions, xpSum] = await Promise.all([
      prisma.student.count({
        where: { user: { schoolId } },
      }),
      prisma.classGroup.count({ where: { schoolId } }),
      prisma.grade.aggregate({
        where: { student: { user: { schoolId } } },
        _avg: { value: true },
      }),
      prisma.attendance.groupBy({
        by: ["status"],
        where: { student: { user: { schoolId } } },
        _count: true,
      }),
      prisma.mission.count({ where: { schoolId, isActive: true } }),
      prisma.student.aggregate({
        where: { user: { schoolId } },
        _sum: { xpTotal: true },
      }),
    ]);

    const averageGrade = gradeAgg._avg.value ?? 0;

    const totalAttendance = attendanceGroups.reduce((sum, group) => sum + group._count, 0);
    const presentCount = attendanceGroups
      .filter((group) => group.status === "present" || group.status === "late")
      .reduce((sum, group) => sum + group._count, 0);
    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

    return {
      totalStudents: students ?? 0,
      totalClasses: classes ?? 0,
      averageGrade: isNaN(averageGrade) ? 0 : averageGrade,
      attendanceRate: isNaN(attendanceRate) ? 0 : attendanceRate,
      activeMissions: activeMissions ?? 0,
      totalXpAwarded: xpSum._sum.xpTotal ?? 0,
    };
    });
  } catch (err) {
    console.error("[getDashboardStats] Error:", err);
    return empty;
  }
});

export async function getRanking(schoolId: string | null, classId?: string | null, take?: number) {
  if (!schoolId) return [];

  try {
    const students = await prisma.student.findMany({
      where: {
        user: { schoolId },
        ...(classId ? studentInClassFilter(classId) : {}),
      },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
        classGroup: { select: { name: true } },
      },
      orderBy: { xpTotal: "desc" },
      take: take ?? (classId ? 50 : 20),
    });

    return students.map((s, i) => ({
      rank: i + 1,
      id: s.id,
      name: s.user?.fullName ?? "Aluno",
      avatarUrl: s.user?.avatarUrl ?? null,
      xp: s.xpTotal ?? 0,
      level: s.level ?? 1,
      coins: s.coins ?? 0,
      className: s.classGroup?.name ?? "-",
    }));
  } catch (err) {
    console.error("[getRanking] Error:", err);
    return [];
  }
}

export async function getMonthlyAttendance(
  schoolId: string | null,
  options?: {
    month?: number;
    year?: number;
    classId?: string;
    teacherClassIds?: string[];
    studentId?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }
) {
  if (!schoolId) {
    return {
      records: [],
      totalCount: 0,
      totalMonthlyRecords: 0,
      totalAbsences: 0,
      attendanceRate: 0,
      alertedStudents: [],
      studentAbsenceMap: new Map<string, number>(),
      page: 1,
      totalPages: 1,
    };
  }
  try {
    const now = new Date();
    const month = options?.month ?? (now.getMonth() + 1);
    const year = options?.year ?? now.getFullYear();
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.max(1, options?.pageSize ?? 50);

    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 1, 0, 0, 0, 0);
    const search = options?.search?.trim();

    const classCondition = options?.classId
      ? { classId: options.classId }
      : options?.teacherClassIds && options.teacherClassIds.length > 0
      ? { classId: { in: options.teacherClassIds } }
      : {};

    const where = {
      student: {
        user: {
          schoolId,
          ...(search ? { fullName: { contains: search } } : {}),
        },
      },
      ...classCondition,
      ...(options?.studentId ? { studentId: options.studentId } : {}),
      ...(options?.status ? { status: options.status } : {}),
      date: { gte: startDate, lt: endDate },
    };

    const baseWhere = {
      student: { user: { schoolId } },
      ...classCondition,
      date: { gte: startDate, lt: endDate },
    };

    const [totalCount, records, monthlyAbsencesGroup] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        include: {
          student: {
            include: {
              user: { select: { fullName: true, phone: true } },
              parentLinks: {
                include: { parent: { select: { fullName: true, phone: true } } },
              },
            },
          },
          classGroup: { select: { name: true } },
          justifiedBy: { select: { fullName: true } },
        },
        orderBy: [
          { date: "desc" },
          { student: { user: { fullName: "asc" } } },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.attendance.findMany({
        where: baseWhere,
        select: {
          status: true,
          studentId: true,
          student: {
            select: {
              id: true,
              user: { select: { fullName: true, phone: true } },
              classGroup: { select: { name: true } },
              parentLinks: {
                include: { parent: { select: { fullName: true, phone: true } } },
              },
            },
          },
        },
      }),
    ]);

    let totalAbsences = 0;
    let presentCount = 0;
    const studentAbsencesCountMap = new Map<string, number>();
    const studentDetailMap = new Map<
      string,
      {
        id: string;
        name: string;
        className: string;
        phone?: string | null;
        parents: Array<{ name: string; phone?: string | null }>;
        absences: number;
      }
    >();

    for (const record of monthlyAbsencesGroup) {
      if (record.status === "absent") {
        totalAbsences++;
      } else if (record.status === "present" || record.status === "late") {
        presentCount++;
      }

      const existing = studentDetailMap.get(record.studentId);
      if (existing) {
        if (record.status === "absent") {
          existing.absences++;
          studentAbsencesCountMap.set(record.studentId, existing.absences);
        }
      } else {
        const absences = record.status === "absent" ? 1 : 0;
        studentAbsencesCountMap.set(record.studentId, absences);
        studentDetailMap.set(record.studentId, {
          id: record.studentId,
          name: record.student.user.fullName,
          className: record.student.classGroup?.name ?? "-",
          phone: record.student.user.phone,
          parents: record.student.parentLinks.map((p) => ({
            name: p.parent.fullName,
            phone: p.parent.phone,
          })),
          absences,
        });
      }
    }

    const alertedStudents = Array.from(studentDetailMap.values())
      .filter((s) => s.absences > 3)
      .sort((a, b) => b.absences - a.absences);

    const totalMonthlyRecords = monthlyAbsencesGroup.length;
    const attendanceRate = totalMonthlyRecords > 0 ? Math.round((presentCount / totalMonthlyRecords) * 100) : 0;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return {
      records,
      totalCount,
      totalMonthlyRecords,
      totalAbsences,
      attendanceRate,
      alertedStudents,
      studentAbsenceMap: studentAbsencesCountMap,
      page,
      totalPages,
    };
  } catch (err) {
    console.error("[getMonthlyAttendance] Error:", err);
    return {
      records: [],
      totalCount: 0,
      totalMonthlyRecords: 0,
      totalAbsences: 0,
      attendanceRate: 0,
      alertedStudents: [],
      studentAbsenceMap: new Map<string, number>(),
      page: 1,
      totalPages: 1,
    };
  }
}

export const getMonthlyPerformance = cache(async (schoolId: string | null) => {
  if (!schoolId) return [];

  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

    const [grades, xp, attendance] = await Promise.all([
      prisma.grade.findMany({
        where: {
          student: { user: { schoolId } },
          createdAt: { gte: sixMonthsAgo },
        },
        select: { value: true, createdAt: true },
      }),
      prisma.xpTransaction.findMany({
        where: {
          student: { user: { schoolId } },
          createdAt: { gte: sixMonthsAgo },
        },
        select: { amount: true, createdAt: true },
      }),
      prisma.attendance.findMany({
        where: {
          student: { user: { schoolId } },
          date: { gte: sixMonthsAgo },
        },
        select: { status: true, date: true },
      }),
    ]);

    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const result: Record<string, { nota: number; xp: number; frequencia: number; notaCount: number; freqCount: number }> = {};

    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const key = months[d.getMonth()];
      result[key] = { nota: 0, xp: 0, frequencia: 0, notaCount: 0, freqCount: 0 };
    }

    grades.forEach((g) => {
      const key = months[g.createdAt.getMonth()];
      if (result[key]) {
        result[key].nota += g.value ?? 0;
        result[key].notaCount++;
      }
    });

    xp.forEach((x) => {
      const key = months[x.createdAt.getMonth()];
      if (result[key]) result[key].xp += x.amount ?? 0;
    });

    attendance.forEach((a) => {
      const key = months[a.date.getMonth()];
      if (result[key]) {
        result[key].freqCount++;
        if (a.status === "present" || a.status === "late") result[key].frequencia++;
      }
    });

    return Object.entries(result).map(([month, data]) => {
      const nota = data.notaCount ? Math.round((data.nota / data.notaCount) * 10) / 10 : 0;
      const freq = data.freqCount ? Math.round((data.frequencia / data.freqCount) * 100) : 0;
      return {
        month,
        nota: isNaN(nota) ? 0 : nota,
        xp: isNaN(data.xp) ? 0 : data.xp,
        frequencia: isNaN(freq) ? 0 : freq,
      };
    });
  } catch (err) {
    console.error("[getMonthlyPerformance] Error:", err);
    return [];
  }
});

export const getClassComparison = cache(async (schoolId: string | null) => {
  if (!schoolId) return [];

  try {
    const [classes, grades, xpByClass] = await Promise.all([
      prisma.classGroup.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      }),
      prisma.grade.findMany({
        where: { student: { user: { schoolId }, classId: { not: null } } },
        select: { value: true, student: { select: { classId: true } } },
      }),
      prisma.student.groupBy({
        by: ["classId"],
        where: { user: { schoolId }, classId: { not: null } },
        _avg: { xpTotal: true },
        _count: true,
      }),
    ]);

    const xpMap = new Map(
      xpByClass.filter((row) => row.classId).map((row) => [row.classId!, row._avg.xpTotal ?? 0])
    );

    return classes.map((c) => {
      const classGrades = grades
        .filter((g) => g.student.classId === c.id)
        .map((g) => g.value)
        .filter((v): v is number => typeof v === "number" && !isNaN(v));
      const media =
        classGrades.length > 0 ? classGrades.reduce((sum, v) => sum + v, 0) / classGrades.length : 0;
      const avgXp = xpMap.get(c.id) ?? 0;
      const engajamento = Math.min(100, Math.max(0, Math.round((avgXp / 3000) * 100)));
      const roundedMedia = Math.round(media * 10);
      return {
        turma: c.name ?? "Turma",
        media: isNaN(roundedMedia) ? 0 : roundedMedia,
        engajamento: isNaN(engajamento) ? 0 : engajamento,
      };
    });
  } catch (err) {
    console.error("[getClassComparison] Error:", err);
    return [];
  }
});

export async function getStudents(schoolId: string | null) {
  if (!schoolId) return [];
  const baseInclude = {
    user: { select: { fullName: true, email: true, avatarUrl: true } },
    classGroup: { select: { id: true, name: true } },
  } as const;

  try {
    const [students, gradeAvgs] = await Promise.all([
      prisma.student.findMany({
        where: { user: { schoolId } },
        include: {
          ...baseInclude,
          classEnrollments: {
            where: { status: { in: ["active", "locked"] } },
            include: { classGroup: { select: { id: true, name: true } } },
            orderBy: { enrolledAt: "asc" },
          },
        },
        orderBy: { user: { fullName: "asc" } },
      }),
      prisma.grade.groupBy({
        by: ["studentId"],
        where: { student: { user: { schoolId } } },
        _avg: { value: true },
      }),
    ]);

    const avgMap = new Map(gradeAvgs.map((row) => [row.studentId, row._avg.value ?? 0]));

    return sortStudentsByName(
      students.map((student) => ({
        ...student,
        classEnrollments: sortByTextPt(student.classEnrollments ?? [], (item) => item.classGroup.name),
        grades: avgMap.has(student.id) ? [{ value: avgMap.get(student.id)! }] : [],
      }))
    );
  } catch (err) {
    console.error("[getStudents] Erro com matrículas — tentando consulta básica:", err);
    try {
      const [students, gradeAvgs] = await Promise.all([
        prisma.student.findMany({
          where: { user: { schoolId } },
          include: baseInclude,
          orderBy: { user: { fullName: "asc" } },
        }),
        prisma.grade.groupBy({
          by: ["studentId"],
          where: { student: { user: { schoolId } } },
          _avg: { value: true },
        }),
      ]);
      const avgMap = new Map(gradeAvgs.map((row) => [row.studentId, row._avg.value ?? 0]));
      return sortStudentsByName(
        students.map((student) => ({
          ...student,
          classEnrollments: [],
          grades: avgMap.has(student.id) ? [{ value: avgMap.get(student.id)! }] : [],
        }))
      );
    } catch (fallbackErr) {
      console.error("[getStudents] Falha total:", fallbackErr);
      return [];
    }
  }
}

export async function getStudentById(id: string, schoolId: string | null) {
  if (!schoolId) return null;
  try {
    return await prisma.student.findFirst({
      where: { id, user: { schoolId } },
      include: {
        user: true,
        classGroup: true,
        classEnrollments: {
          include: { classGroup: true },
          orderBy: { enrolledAt: "asc" },
        },
        grades: { orderBy: { createdAt: "desc" } },
        attendance: { orderBy: { date: "desc" }, take: 90 },
        xpTransactions: { orderBy: { createdAt: "desc" }, take: 40 },
        studentMissions: { include: { mission: true } },
        studentBadges: { include: { badge: true } },
        profileActivities: { orderBy: { occurredAt: "desc" }, take: 40 },
        parentLinks: {
          include: { parent: { select: { fullName: true, email: true, phone: true } } },
        },
        rewardRedemptions: {
          include: { reward: { select: { name: true } } },
          orderBy: { redeemedAt: "desc" },
          take: 12,
        },
        trailProgress: {
          include: { trail: { select: { title: true } } },
          orderBy: { createdAt: "desc" },
        },
        financeAccount: {
          include: { payments: { orderBy: { paidAt: "desc" } } },
        },
      },
    });
  } catch (err) {
    console.error("[getStudentById] Error:", err);
    return null;
  }
}

export async function getClasses(schoolId: string | null, teacherId?: string) {
  if (!schoolId) return [];
  const where = {
    schoolId,
    ...(teacherId ? teacherClassWhere(teacherId) : {}),
  };
  const baseInclude = {
    teacher: { select: { id: true, fullName: true, avatarUrl: true } },
    coTeachers: {
      include: { teacher: { select: { id: true, fullName: true, avatarUrl: true } } },
    },
    students: {
      select: {
        id: true,
        user: { select: { fullName: true, avatarUrl: true } },
      },
    },
    _count: {
      select: { students: true },
    },
  } as const;

  const sortClassRoster = <
    T extends {
      name: string;
      students: Array<{ id: string; user: { fullName: string; avatarUrl?: string | null } }>;
      enrollments?: Array<{ student: { id: string; user: { fullName: string; avatarUrl?: string | null } } }>;
    },
  >(
    classes: T[]
  ) =>
    sortByTextPt(
      classes.map((turma) => {
        const enrolledStudents = (turma.enrollments ?? []).map((e) => e.student);
        const enrolledIds = new Set(enrolledStudents.map((s) => s.id));
        const legacyStudents = turma.students.filter((s) => !enrolledIds.has(s.id));
        const combinedStudents = sortByTextPt([...enrolledStudents, ...legacyStudents], (s) => s.user.fullName);

        return {
          ...turma,
          students: combinedStudents,
          enrollments: turma.enrollments
            ? sortByTextPt(turma.enrollments, (enrollment) => enrollment.student.user.fullName)
            : turma.enrollments,
        };
      }),
      (turma) => turma.name
    );

  try {
    const classes = await prisma.classGroup.findMany({
      where,
      include: {
        ...baseInclude,
        enrollments: {
          where: activeEnrollmentWhere(),
          include: {
            student: {
              select: {
                id: true,
                user: { select: { fullName: true, avatarUrl: true } },
              },
            },
          },
        },
        _count: {
          select: {
            students: true,
            enrollments: { where: activeEnrollmentWhere() },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return sortClassRoster(classes);
  } catch (err) {
    console.error("[getClasses] Erro com matrículas — tentando consulta básica:", err);
    try {
      const classes = await prisma.classGroup.findMany({
        where,
        include: baseInclude,
        orderBy: { name: "asc" },
      });
      return sortClassRoster(classes.map((turma) => ({ ...turma, enrollments: [] })));
    } catch (fallbackErr) {
      console.error("[getClasses] Falha total:", fallbackErr);
      return [];
    }
  }
}

export async function getGrades(schoolId: string | null) {
  if (!schoolId) return [];
  try {
    return await prisma.grade.findMany({
      where: { student: { user: { schoolId } } },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  } catch (err) {
    console.error("[getGrades] Error:", err);
    return [];
  }
}

export async function getAttendance(schoolId: string | null, date?: Date) {
  if (!schoolId) return [];
  try {
    const targetDate = date ?? new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return await prisma.attendance.findMany({
      where: {
        student: { user: { schoolId } },
        date: { gte: targetDate, lt: nextDay },
      },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        classGroup: { select: { name: true } },
        justifiedBy: { select: { fullName: true } },
      },
      orderBy: { student: { user: { fullName: "asc" } } },
    });
  } catch (err) {
    console.error("[getAttendance] Error:", err);
    return [];
  }
}

export async function getMissions(schoolId: string | null) {
  if (!schoolId) return [];
  try {
    return await prisma.mission.findMany({
      where: { schoolId },
      include: {
        classGroup: { select: { name: true } },
        studentMissions: { select: { studentId: true, completedAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("[getMissions] Error:", err);
    return [];
  }
}

export async function getMissionsForStudent(schoolId: string | null, classId: string | null) {
  if (!schoolId) return [];
  try {
    return await prisma.mission.findMany({
      where: {
        schoolId,
        isActive: true,
        OR: [{ classId: null }, ...(classId ? [{ classId }] : [])],
      },
      include: {
        classGroup: { select: { name: true } },
        studentMissions: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("[getMissionsForStudent] Error:", err);
    return [];
  }
}

/** Copia atitudes da escola para turmas que ainda não têm as próprias. */
export async function ensureClassAttitudeCopies(schoolId: string, classIds: string[]) {
  if (classIds.length === 0) return;
  try {
    const templates = await prisma.badge.findMany({
      where: { schoolId, classId: null },
    });
    if (templates.length === 0) return;

    for (const classId of classIds) {
      const existing = await prisma.badge.count({ where: { schoolId, classId } });
      if (existing > 0) continue;
      await prisma.badge.createMany({
        data: templates.map((template) => ({
          schoolId,
          classId,
          name: template.name,
          description: template.description,
          icon: template.icon,
          xpRequired: template.xpRequired,
        })),
      });
    }
  } catch (err) {
    console.error("[ensureClassAttitudeCopies] Error:", err);
  }
}

export async function getBadges(schoolId: string | null, teacherId?: string) {
  if (!schoolId) return [];
  try {
    const teacherWhere = teacherId ? teacherClassWhere(teacherId) : undefined;

    return await prisma.badge.findMany({
      where: {
        schoolId,
        ...(teacherWhere
          ? {
              OR: [
                { classGroup: teacherWhere },
                { classes: { some: { classGroup: teacherWhere } } },
              ],
            }
          : {}),
      },
      include: {
        classGroup: { select: { id: true, name: true, gradeLevel: true, courseId: true } },
        classes: { include: { classGroup: { select: { id: true, name: true, gradeLevel: true, courseId: true } } } },
        studentBadges: { select: { studentId: true } },
        _count: { select: { studentBadges: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    });
  } catch (err) {
    console.error("[getBadges] Error:", err);
    return [];
  }
}

export async function getRecentXp(schoolId: string | null, limit = 10) {
  if (!schoolId) return [];
  try {
    return await prisma.xpTransaction.findMany({
      where: { student: { user: { schoolId } } },
      include: { student: { include: { user: { select: { fullName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (err) {
    console.error("[getRecentXp] Error:", err);
    return [];
  }
}

export async function getTeachers(schoolId: string | null) {
  if (!schoolId) return [];
  try {
    const teachers = await prisma.user.findMany({
      where: { schoolId, role: "teacher" },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        city: true,
        state: true,
        street: true,
        streetNumber: true,
        addressComplement: true,
      },
      orderBy: { fullName: "asc" },
    });
    return sortTeachersByName(teachers);
  } catch (err) {
    console.error("[getTeachers] Error:", err);
    return [];
  }
}

export const getSchool = cache(async (user: SessionUser) => {
  if (!user.schoolId) return null;
  try {
    return await cacheGetOrSet(`school:${user.schoolId}:record`, CACHE_TTL.schoolRecord, () =>
      prisma.school.findUnique({ where: { id: user.schoolId! } })
    );
  } catch (err) {
    console.error("[getSchool] Error:", err);
    return null;
  }
});
