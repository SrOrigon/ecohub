"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { userExistsByEmail } from "@/lib/user-lookup";
import { prisma } from "@/lib/db";
import { requireSessionResult } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getSchoolSettings } from "@/lib/school-settings";
import { canAcceptPublicSignup } from "@/lib/school-verification";
import { fetchTeacherInviteByToken } from "@/lib/reads/teacher-invite-reads";
import {
  AUTH_RATE_LIMIT,
  enforceRateLimit,
  RateLimitError,
  rateLimitMessage,
} from "@/lib/security/rate-limit";
import { validatePassword, hashPassword, normalizePassword } from "@/lib/security/password-policy";
import { resolveAvatarFromForm } from "@/lib/avatar";
import { sendEmail } from "@/lib/email";
import { isNextRedirect } from "@/lib/run-server-action";
import { ensureUserPersistedOrFail } from "@/lib/persistence-guard";
import { invalidateSchoolCaches } from "@/lib/runtime-cache";

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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  const invitePath = `/convite/professor/${invite.token}`;
  const fullUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}${invitePath}` : invitePath;

  let emailSent = false;
  let emailSkipped = false;
  if (email) {
    const result = await sendEmail({
      to: email,
      subject: `Convite para professor  -  ${school.name}`,
      html: `
        <p>Olá,</p>
        <p>Você foi convidado(a) para lecionar em <strong>${school.name}</strong> no Ecohub.</p>
        <p><a href="${fullUrl}">Clique aqui para aceitar o convite</a> (válido por ${INVITE_TTL_DAYS} dias).</p>
        <p>Se o link não abrir, copie e cole no navegador:<br/><code>${fullUrl}</code></p>
      `,
    });
    emailSent = result.sent;
    emailSkipped = !!result.skipped;
  }

  return {
    success: true,
    token: invite.token,
    url: invitePath,
    expiresAt: invite.expiresAt.toISOString(),
    emailSent,
    emailSkipped,
  };
}

export async function deleteTeacherInviteAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "director" && !hasPermission(user.role, settings, "director.manageTeachers")) {
    return { error: "Sem permissão para gerenciar convites." };
  }

  const inviteId = String(formData.get("inviteId") ?? "");
  if (!inviteId) return { error: "Convite inválido." };

  const invite = await prisma.teacherInvite.findFirst({
    where: { id: inviteId, schoolId: user.schoolId },
  });
  if (!invite) return { error: "Convite não encontrado." };
  if (invite.usedAt) {
    return { error: "Convites já utilizados não podem ser excluídos." };
  }

  await prisma.teacherInvite.delete({ where: { id: inviteId } });
  revalidateInvites();
  return { success: true };
}

export async function acceptTeacherInviteAction(formData: FormData) {
  try {
    return await acceptTeacherInviteActionImpl(formData);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("[invites] acceptTeacherInviteAction falhou:", error);
    return {
      error: "Não foi possível concluir o cadastro agora. Verifique os dados e tente novamente.",
    };
  }
}

async function acceptTeacherInviteActionImpl(formData: FormData) {
  const token = formData.get("token")?.toString();
  const fullName = formData.get("fullName")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = normalizePassword(formData.get("password")?.toString() ?? "");

  if (!token || !fullName || !email || !password) {
    return { error: "Preencha todos os campos." };
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) return { error: passwordCheck.error };

  try {
    await enforceRateLimit("invite-accept", email, AUTH_RATE_LIMIT.inviteAccept);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { error: rateLimitMessage(error.retryAfterSec) };
    }
    throw error;
  }

  const inviteData = await fetchTeacherInviteByToken(token);
  if (!inviteData || inviteData.status !== "valid") {
    return { error: "Convite inválido, expirado ou já utilizado." };
  }
  if (inviteData.email && inviteData.email !== email) {
    return { error: "Use o e-mail para o qual o convite foi enviado." };
  }

  if (await userExistsByEmail(email)) {
    return { error: "Não foi possível criar a conta. Verifique os dados." };
  }

  const passwordHash = await hashPassword(password);

  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim().toUpperCase();
  const avatarResult = await resolveAvatarFromForm(formData, null);
  if (avatarResult && typeof avatarResult === "object" && "error" in avatarResult) {
    return { error: avatarResult.error };
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: "teacher",
        schoolId: inviteData.schoolId,
        avatarUrl: avatarResult as string | null,
        city: city || null,
        state: state || null,
      },
    });
    await tx.teacherInvite.update({
      where: { id: inviteData.id },
      data: { usedAt: new Date(), usedById: created.id },
    });
    return created;
  });

  const persisted = await ensureUserPersistedOrFail(
    (id) => prisma.user.findUnique({ where: { id }, select: { id: true } }),
    user.id
  );
  if (!persisted.ok) return { error: persisted.error };

  invalidateSchoolCaches(inviteData.schoolId, inviteData.school.slug);

  const { safeEstablishSession } = await import("@/lib/auth");
  const session = await safeEstablishSession(user, { tenantSlug: inviteData.school.slug });
  if (!session.ok) {
    return {
      success: true,
      loginRequired: true,
      email,
      message:
        "Conta criada com sucesso. Faça login em /login/professor com seu e-mail e senha.",
    };
  }

  revalidateInvites();
  const { redirect } = await import("next/navigation");
  redirect("/dashboard/professor");
}
