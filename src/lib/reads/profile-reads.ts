import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertSelfOrSchoolStaff, assertSameSchool } from "@/lib/security/access-control";

export async function fetchProfileData(actor: SessionUser, userId: string) {
  assertSelfOrSchoolStaff(actor, userId);

  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      avatarUrl: true,
      city: true,
      state: true,
      schoolId: true,
      createdAt: true,
      school: { select: { name: true, slug: true, city: true, state: true } },
      student: {
        select: {
          id: true,
          enrollmentCode: true,
          level: true,
          xpTotal: true,
          coins: true,
          classGroup: { select: { name: true } },
        },
      },
      parentLinks: {
        select: {
          relation: true,
          student: {
            select: {
              id: true,
              user: { select: { fullName: true, avatarUrl: true } },
              classGroup: { select: { name: true } },
            },
          },
        },
      },
      taughtClasses: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      _count: {
        select: {
          notifications: true,
          parentLinks: true,
          taughtClasses: true,
        },
      },
    },
  });

  if (!profile) return null;
  if (actor.id !== userId && actor.schoolId) {
    assertSameSchool(actor, profile.schoolId);
  }

  return profile;
}
