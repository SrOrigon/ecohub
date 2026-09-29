"use server";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { randomBytes } from "crypto";

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "E-mail obrigatório" };
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return { success: true }; // Prevent email enumeration
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      email: user.email,
      token,
      expiresAt,
    },
  });

  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Redefinição de senha",
    html: `
      <h1>Redefinição de senha</h1>
      <p>Clique no link abaixo para redefinir sua senha:</p>
      <a href="${resetLink}">Redefinir senha</a>
    `,
  });

  return { success: true };
}

export async function resetPassword(formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  if (!token || !password) {
    return { error: "Token e senha são obrigatórios" };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return { error: "Token inválido ou expirado" };
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { email: resetToken.email },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.delete({
    where: { id: resetToken.id },
  });

  return { success: true };
}
