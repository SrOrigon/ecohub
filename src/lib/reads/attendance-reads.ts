import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertRole, assertSameSchool } from "@/lib/security/access-control";
import { studentInTeacherClassWhere } from "@/lib/teacher-classes";

export async function fetchJustifiedAttendance(
  actor: SessionUser,
  schoolId: string | null,
  teacherId?: string
) {
  if (!schoolId) return [];
  assertRole(actor, ["admin", "director", "teacher"]);
  assertSameSchool(actor, schoolId);

  const records = await prisma.attendance.findMany({
    where: {
      status: "justified",
      student: {
        user: { schoolId },
        ...(teacherId ? studentInTeacherClassWhere(teacherId) : {}),
      },
    },
    include: {
      student: {
        include: {
          user: { select: { fullName: true } },
          classGroup: { select: { name: true } },
        },
      },
      justifiedBy: { select: { fullName: true } },
    },
    orderBy: { justifiedAt: "desc" },
    take: 30,
  });

  return records;
}
