import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { canAcceptPublicSignup } from "@/lib/school-verification";
import { assertRole, assertSameSchool } from "@/lib/security/access-control";

export async function fetchTeacherInvitesForSchool(actor: SessionUser, schoolId: string) {
  assertRole(actor, ["admin", "director"]);
  assertSameSchool(actor, schoolId);

  return prisma.teacherInvite.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      email: true,
      expiresAt: true,
      usedAt: true,
      createdAt: true,
      invitedBy: { select: { fullName: true } },
      usedBy: { select: { fullName: true, email: true } },
    },
  });
}

/** Leitura para página de convite (server component). */
export async function fetchTeacherInviteByToken(token: string) {
  const invite = await prisma.teacherInvite.findUnique({
    where: { token },
    include: {
      school: { select: { id: true, name: true, slug: true, verificationStatus: true } },
    },
  });
  if (!invite) return null;
  if (invite.usedAt) return { ...invite, status: "used" as const };
  if (invite.expiresAt < new Date()) return { ...invite, status: "expired" as const };
  if (!canAcceptPublicSignup(invite.school.verificationStatus)) {
    return { ...invite, status: "school_unverified" as const };
  }
  return { ...invite, status: "valid" as const };
}
