"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyStudent } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export const PARENT_STICKERS = [
  { id: "star", emoji: "🌟", label: "Parabéns!", message: "seus pais enviaram uma estrela brilhante de parabéns!" },
  { id: "rocket", emoji: "🚀", label: "Orgulho de você!", message: "seus pais estão muito orgulhosos do seu esforço e dedicação!" },
  { id: "muscle", emoji: "💪", label: "Continue firme!", message: "seus pais mandaram força e energia para os seus estudos!" },
  { id: "trophy", emoji: "🏆", label: "Você é campeão!", message: "seus pais celebraram suas conquistas como um verdadeiro campeão!" },
  { id: "heart", emoji: "❤️", label: "Muito amor!", message: "seus pais mandaram muito amor e carinho para você hoje!" },
];

export async function sendParentEncouragementAction(formData: FormData) {
  const user = await requireSession(["parent"]);
  const studentId = String(formData.get("studentId") ?? "").trim();
  const stickerId = String(formData.get("stickerId") ?? "").trim();

  if (!studentId || !stickerId) {
    return { error: "Dados incompletos." };
  }

  // Verifica se o aluno é realmente filho vinculado a este pai
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId: user.id, studentId } },
  });
  if (!link) {
    return { error: "Aluno não vinculado ao seu perfil de responsável." };
  }

  const sticker = PARENT_STICKERS.find((s) => s.id === stickerId) ?? PARENT_STICKERS[0];

  // Cria registro de atividade de perfil do aluno
  await prisma.studentActivity.create({
    data: {
      studentId,
      type: "parent_encouragement",
      title: `${sticker.emoji} Incentivo da Família: "${sticker.label}"`,
      detail: `${user.fullName} enviou: ${sticker.message}`,
    },
  });

  // Notifica o aluno imediatamente
  await notifyStudent(
    studentId,
    `${sticker.emoji} Recado especial da sua família!`,
    `${user.fullName}: "${sticker.label}"`,
    `/dashboard/aluno`
  );

  revalidatePath(`/dashboard/responsavel/filho/${studentId}`);
  revalidatePath("/dashboard/aluno");

  return {
    success: true,
    message: `Incentivo "${sticker.label}" enviado com sucesso!`,
    emoji: sticker.emoji,
  };
}
