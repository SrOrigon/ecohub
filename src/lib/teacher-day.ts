import { prisma } from "@/lib/db";
import { teacherClassWhere } from "@/lib/teacher-classes";
import type { TeacherClassDayItem } from "@/components/teacher/teacher-day-overview";

export async function getTeacherDayOverview(schoolId: string, teacherId: string): Promise<TeacherClassDayItem[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const classes = await prisma.classGroup.findMany({
    where: { schoolId, ...teacherClassWhere(teacherId) },
    include: {
      _count: { select: { students: true } },
      students: { select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  if (classes.length === 0) return [];

  const classIds = classes.map((c) => c.id);
  const studentIds = classes.flatMap((c) => c.students.map((s) => s.id));

  const [attendanceToday, pendingMissions, pendingSubmissions] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        classId: { in: classIds },
        date: { gte: today, lt: tomorrow },
      },
      select: { classId: true, studentId: true },
    }),
    prisma.studentMission.findMany({
      where: {
        completedAt: null,
        studentId: { in: studentIds },
        mission: { schoolId, isActive: true },
      },
      select: { student: { select: { classId: true } } },
    }),
    prisma.exerciseSubmission.findMany({
      where: {
        status: "submitted",
        exercise: { teacherId, schoolId },
      },
      select: { exercise: { select: { classId: true } } },
    }),
  ]);

  const attendanceByClass = new Map<string, number>();
  for (const a of attendanceToday) {
    attendanceByClass.set(a.classId, (attendanceByClass.get(a.classId) ?? 0) + 1);
  }

  const missionsByClass = new Map<string, number>();
  for (const m of pendingMissions) {
    const cid = m.student.classId;
    if (cid) missionsByClass.set(cid, (missionsByClass.get(cid) ?? 0) + 1);
  }

  const submissionsByClass = new Map<string, number>();
  for (const s of pendingSubmissions) {
    const cid = s.exercise.classId;
    if (cid) submissionsByClass.set(cid, (submissionsByClass.get(cid) ?? 0) + 1);
  }

  return classes.map((c) => ({
    id: c.id,
    name: c.name,
    studentCount: c._count.students,
    attendanceDone: (attendanceByClass.get(c.id) ?? 0) >= c._count.students && c._count.students > 0,
    pendingMissions: missionsByClass.get(c.id) ?? 0,
    pendingSubmissions: submissionsByClass.get(c.id) ?? 0,
  }));
}
