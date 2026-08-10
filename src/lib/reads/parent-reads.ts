import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import {
  assertParentSelf,
  assertRole,
  assertSameSchool,
  AccessDeniedError,
} from "@/lib/security/access-control";
import { SAFE_STUDENT_USER_SELECT, SAFE_USER_SELECT } from "@/lib/security/constants";

export async function fetchParentsForSchool(actor: SessionUser, schoolId: string | null) {
  if (!schoolId) return [];
  assertRole(actor, ["admin", "director"]);
  assertSameSchool(actor, schoolId);

  const parents = await prisma.user.findMany({
    where: { schoolId, role: "parent" },
    select: SAFE_USER_SELECT,
    orderBy: { fullName: "asc" },
  });

  if (parents.length === 0) return [];

  const links = await prisma.parentStudent.findMany({
    where: { parentId: { in: parents.map((p) => p.id) } },
    include: {
      student: {
        include: {
          user: { select: SAFE_STUDENT_USER_SELECT },
          classGroup: true,
        },
      },
    },
  });

  const linksByParent = new Map<string, typeof links>();
  for (const link of links) {
    const group = linksByParent.get(link.parentId) ?? [];
    group.push(link);
    linksByParent.set(link.parentId, group);
  }

  return parents.map((parent) => ({
    ...parent,
    parentLinks: linksByParent.get(parent.id) ?? [],
  }));
}

export async function fetchParentClassIds(actor: SessionUser, parentId: string) {
  assertParentSelf(actor, parentId);

  const links = await prisma.parentStudent.findMany({
    where: { parentId },
    select: { student: { select: { classId: true } } },
  });

  return [...new Set(links.map((l) => l.student.classId).filter((id): id is string => Boolean(id)))];
}

export async function fetchParentChildren(actor: SessionUser, parentId: string) {
  assertParentSelf(actor, parentId);

  return prisma.parentStudent.findMany({
    where: { parentId },
    include: {
      student: {
        include: {
          user: { select: SAFE_STUDENT_USER_SELECT },
          classGroup: true,
          grades: { orderBy: { createdAt: "desc" }, take: 10 },
          attendance: { orderBy: { date: "desc" }, take: 10 },
          studentBadges: { include: { badge: true } },
          rewardRedemptions: {
            include: { reward: true },
            orderBy: { redeemedAt: "desc" },
            take: 5,
          },
        },
      },
    },
  });
}

export async function fetchChildForParent(
  actor: SessionUser,
  parentId: string,
  studentId: string
) {
  if (actor.role === "parent") {
    assertParentSelf(actor, parentId);
  } else if (["admin", "director", "teacher"].includes(actor.role)) {
    if (!actor.schoolId) throw new AccessDeniedError();
    const student = await prisma.student.findFirst({
      where: { id: studentId, user: { schoolId: actor.schoolId } },
    });
    if (!student) throw new AccessDeniedError();
  } else {
    throw new AccessDeniedError();
  }

  const link = await prisma.parentStudent.findFirst({
    where: { parentId, studentId },
    include: {
      student: {
        include: {
          user: { select: SAFE_STUDENT_USER_SELECT },
          classGroup: true,
          grades: { orderBy: { createdAt: "desc" } },
          attendance: { orderBy: { date: "desc" }, take: 30 },
          xpTransactions: { orderBy: { createdAt: "desc" }, take: 15 },
          studentMissions: { include: { mission: true } },
          studentBadges: { include: { badge: true } },
          rewardRedemptions: {
            include: { reward: true },
            orderBy: { redeemedAt: "desc" },
          },
        },
      },
    },
  });

  if (!link) throw new AccessDeniedError();
  return link;
}
