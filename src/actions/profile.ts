"use server";

import { revalidatePath } from "next/cache";
import { requireSessionResult } from "@/lib/auth";
import { resolveAvatarFromForm } from "@/lib/avatar";
import { prisma } from "@/lib/db";
import { validatePassword, hashPassword, verifyPassword, normalizePassword } from "@/lib/security/password-policy";

function revalidateProfile() {
  revalidatePath("/dashboard/perfil");
  revalidatePath("/dashboard", "layout");
  [
    "/dashboard/aluno",
    "/dashboard/alunos",
    "/dashboard/responsavel",
    "/dashboard/professor",
    "/dashboard/professores",
    "/dashboard/gamificacao",
    "/dashboard/turmas",
    "/dashboard/responsaveis",
  ].forEach((p) => revalidatePath(p));
}

export async function updateProfileAction(formData: FormData) {
  const session = await requireSessionResult();
  if (!session.ok) return { error: session.error };
  const user = session.user;

  const fullName = String(formData.get("fullName") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim().toUpperCase();

  if (!fullName || fullName.length < 2) {
    return { error: "Informe seu nome completo (mínimo 2 caracteres)." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  });

  const avatarResult = await resolveAvatarFromForm(formData, dbUser?.avatarUrl ?? null);
  if (avatarResult && typeof avatarResult === "object" && "error" in avatarResult) {
    return { error: avatarResult.error };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName,
      avatarUrl: avatarResult as string | null,
      city: city || null,
      state: state || null,
    },
  });

  revalidateProfile();
  return { success: true, message: "Perfil atualizado com sucesso." };
}

export async function changePasswordAction(formData: FormData) {
  const session = await requireSessionResult();
  if (!session.ok) return { error: session.error };
  const user = session.user;

  const currentPassword = normalizePassword(String(formData.get("currentPassword") ?? ""));
  const newPassword = normalizePassword(String(formData.get("newPassword") ?? ""));
  const confirmPassword = normalizePassword(String(formData.get("confirmPassword") ?? ""));

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Preencha todos os campos de senha." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "A confirmação da nova senha não confere." };
  }
  if (currentPassword === newPassword) {
    return { error: "A nova senha deve ser diferente da atual." };
  }

  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.ok) return { error: passwordCheck.error };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!dbUser) return { error: "Usuário não encontrado." };

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!valid) return { error: "Senha atual incorreta." };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  revalidateProfile();
  return { success: true, message: "Senha alterada com sucesso." };
}
