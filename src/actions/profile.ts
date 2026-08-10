"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireSessionResult } from "@/lib/auth";
import {
  fileToAvatarDataUrl,
  isAllowedAvatarMime,
  isValidExternalAvatarUrl,
  AVATAR_MAX_BYTES,
} from "@/lib/avatar";
import { prisma } from "@/lib/db";
import { validatePassword } from "@/lib/security/password-policy";
import { BCRYPT_ROUNDS } from "@/lib/security/constants";

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

async function resolveAvatarFromForm(formData: FormData, currentAvatar: string | null) {
  const removeAvatar = formData.get("removeAvatar") === "1";
  if (removeAvatar) return null;

  const avatarFile = formData.get("avatarFile");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!isAllowedAvatarMime(avatarFile.type)) {
      return { error: "Formato de imagem não suportado. Use JPG, PNG, WebP ou GIF." as const };
    }
    if (avatarFile.size > AVATAR_MAX_BYTES) {
      return { error: "A foto deve ter no máximo 300 KB." as const };
    }
    const dataUrl = await fileToAvatarDataUrl(avatarFile);
    if (typeof dataUrl === "object") return dataUrl;
    return dataUrl;
  }

  const avatarUrlField = String(formData.get("avatarUrl") ?? "").trim();
  if (avatarUrlField) {
    if (!isValidExternalAvatarUrl(avatarUrlField)) {
      return { error: "URL da foto deve começar com http:// ou https://" as const };
    }
    return avatarUrlField;
  }

  return currentAvatar;
}

export async function updateProfileAction(formData: FormData) {
  const session = await requireSessionResult();
  if (!session.ok) return { error: session.error };
  const user = session.user;

  const fullName = String(formData.get("fullName") ?? "").trim();

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
    data: { fullName, avatarUrl: avatarResult as string | null },
  });

  revalidateProfile();
  return { success: true, message: "Perfil atualizado com sucesso." };
}

export async function changePasswordAction(formData: FormData) {
  const session = await requireSessionResult();
  if (!session.ok) return { error: session.error };
  const user = session.user;

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

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

  const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!valid) return { error: "Senha atual incorreta." };

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  revalidateProfile();
  return { success: true, message: "Senha alterada com sucesso." };
}
