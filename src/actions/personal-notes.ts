"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSessionResult } from "@/lib/auth";
import { parseNoteDate } from "@/lib/personal-notes";

const NOTE_ROLES = ["admin", "director", "teacher", "student", "parent"] as const;

function revalidateNotes() {
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/calendario");
  revalidatePath("/dashboard/aluno");
  revalidatePath("/dashboard/professor");
  revalidatePath("/dashboard");
}

export async function createPersonalNoteAction(formData: FormData) {
  const session = await requireSessionResult([...NOTE_ROLES]);
  if (!session.ok) return { error: session.error };

  const content = formData.get("content")?.toString().trim();
  const title = formData.get("title")?.toString().trim() || null;
  const dateStr = formData.get("date")?.toString().trim() || null;
  const mode = formData.get("mode")?.toString();

  if (!content) return { error: "Escreva o conteúdo da anotação." };

  const date =
    mode === "dated" || dateStr ? parseNoteDate(dateStr ?? undefined) : null;

  if ((mode === "dated" || dateStr) && !date) {
    return { error: "Informe uma data válida ou deixe em branco para anotação rápida." };
  }

  await prisma.userNote.create({
    data: {
      userId: session.user.id,
      title,
      content,
      date,
    },
  });

  revalidateNotes();
  return { success: true };
}

export async function updatePersonalNoteAction(formData: FormData) {
  const session = await requireSessionResult([...NOTE_ROLES]);
  if (!session.ok) return { error: session.error };

  const id = formData.get("id")?.toString();
  const content = formData.get("content")?.toString().trim();
  const title = formData.get("title")?.toString().trim() || null;
  const dateStr = formData.get("date")?.toString().trim();
  const clearDate = formData.get("clearDate") === "true";

  if (!id || !content) return { error: "Dados incompletos." };

  const existing = await prisma.userNote.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return { error: "Anotação não encontrada." };

  let date: Date | null = existing.date;
  if (clearDate) {
    date = null;
  } else if (dateStr !== undefined && dateStr !== "") {
    date = parseNoteDate(dateStr);
    if (!date) return { error: "Data inválida." };
  }

  await prisma.userNote.update({
    where: { id },
    data: { title, content, date },
  });

  revalidateNotes();
  return { success: true };
}

export async function deletePersonalNoteAction(formData: FormData) {
  const session = await requireSessionResult([...NOTE_ROLES]);
  if (!session.ok) return { error: session.error };

  const id = formData.get("id")?.toString();
  if (!id) return { error: "Anotação não informada." };

  const existing = await prisma.userNote.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return { error: "Anotação não encontrada." };

  await prisma.userNote.delete({ where: { id } });

  revalidateNotes();
  return { success: true };
}
