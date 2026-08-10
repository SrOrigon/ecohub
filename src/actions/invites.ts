"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSessionResult } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getSchoolSettings } from "@/lib/school-settings";
import { findSchoolBySlug } from "@/lib/school-lookup";
import { canAcceptPublicSignup } from "@/lib/school-verification";

const INVITE_TTL_DAYS = 14;

function revalidateInvites() {
  revalidatePath("/dashboard/professores");
  revalidatePath("/dashboard/configuracoes");
}

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createTeacherInviteAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "director" && !hasPermission(user.role, settings, "director.manageTeachers")) {
    return { error: "Sem permissão para convidar professores." };
  }

  const email = formData.get("email")?.toString().trim().toLowerCase() || null;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const school = await prisma.school.findUnique({ where: { id: user.schoolId } });
  if (!school || !canAcceptPublicSignup(school.verificationStatus)) {
    return { error: "Instituição precisa estar verificada para enviar convites." };
  }

  const invite = await prisma.teacherInvite.create({
    data: {
      schoolId: user.schoolId,
      token: generateToken(),
      email,
      invitedById: user.id,
      expiresAt,
    },
  });

  revalidateInvites();
  return {
    success: true,
    token: invite.token,
    url: `/convite/professor/${invite.token}`,
    expiresAt: invite.expiresAt.toISOString(),
  };
}

export async function getTeacherInvitesForSchool(schoolId: string) {
  return prisma.teacherInvite.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      invitedBy: { select: { fullName: true } },
      usedBy: { select: { fullName: true, email: true } },
    },
  });
}

export async function getTeacherInviteByToken(token: string) {
  const invite = await prisma.teacherInvite.findUnique({
    where: { token },
    include: { school: { select: { id: true, name: true, slug: true, verificationStatus: true } } },
  });
  if (!invite) return null;
  if (invite.usedAt) return { ...invite, status: "used" as const };
  if (invite.expiresAt < new Date()) return { ...invite, status: "expired" as const };
  if (!canAcceptPublicSignup(invite.school.verificationStatus)) {
    return { ...invite, status: "school_unverified" as const };
  }
  return { ...invite, status: "valid" as const };
}

export async function acceptTeacherInviteAction(formData: FormData) {
  const token = formData.get("token")?.toString();
  const fullName = formData.get("fullName")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString() ?? "";

  if (!token || !fullName || !email || !password) {
    return { error: "Preencha todos os campos." };
  }
  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const inviteData = await getTeacherInviteByToken(token);
  if (!inviteData || inviteData.status !== "valid") {
    return { error: "Convite inválido, expirado ou já utilizado." };
  }
  if (inviteData.email && inviteData.email !== email) {
    return { error: "Use o e-mail para o qual o convite foi enviado." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Este e-mail já está cadastrado." };

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: "teacher",
        schoolId: inviteData.schoolId,
      },
    });
    await tx.teacherInvite.update({
      where: { id: inviteData.id },
      data: { usedAt: new Date(), usedById: created.id },
    });
    return created;
  });

  const { establishSession } = await import("@/lib/auth");
  await establishSession(user, { tenantSlug: inviteData.school.slug });

  revalidateInvites();
  const { redirect } = await import("next/navigation");
  redirect("/dashboard/professor");
}

export async function validateInviteTokenAction(token: string) {
  const invite = await getTeacherInviteByToken(token);
  if (!invite) return { error: "Convite não encontrado." };
  return {
    status: invite.status,
    schoolName: invite.school.name,
    schoolSlug: invite.school.slug,
    email: invite.email,
    expiresAt: invite.expiresAt.toISOString(),
  };
}

export async function listSchoolBySlugForTenant(slug: string) {
  return findSchoolBySlug(slug);
}
