"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";

function revalidateAnnouncements() {
  revalidatePath("/dashboard/comunicados");
  revalidatePath("/dashboard/aluno");
  revalidatePath("/dashboard/professor");
  revalidatePath("/dashboard/responsavel");
}

export async function createAnnouncementAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.createAnnouncements")) {
    return { error: "Sem permissão para publicar comunicados." };
  }

  const title = formData.get("title")?.toString().trim();
  const body = formData.get("body")?.toString().trim();
  const classId = formData.get("classId")?.toString() || null;

  if (!title || !body) return { error: "Título e mensagem são obrigatórios." };

  const announcement = await prisma.announcement.create({
    data: {
      schoolId: user.schoolId,
      classId: classId || null,
      authorId: user.id,
      title,
      body,
    },
  });

  const recipients = await prisma.user.findMany({
    where: {
      schoolId: user.schoolId,
      id: { not: user.id },
      ...(classId
        ? {
            OR: [
              { role: { in: ["admin", "director"] } },
              { student: { classId } },
              { parentLinks: { some: { student: { classId } } } },
              { taughtClasses: { some: { id: classId } } },
            ],
          }
        : {}),
    },
    select: { id: true },
  });

  if (settings.notifications.parentsOnAnnouncement !== false) {
    for (const r of recipients) {
      if (r.id === user.id) continue;
      await createNotification(
        r.id,
        title,
        body.slice(0, 160),
        "/dashboard/comunicados"
      );
    }
  }

  revalidateAnnouncements();
  return { success: true, id: announcement.id };
}

export async function markAnnouncementReadAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher", "student", "parent"]);
  if (!user.schoolId) return { error: "Escola não configurada." };
  const id = formData.get("announcementId")?.toString();
  if (!id) return { error: "Comunicado inválido." };

  const announcement = await prisma.announcement.findFirst({
    where: { id, schoolId: user.schoolId },
  });
  if (!announcement) return { error: "Comunicado não encontrado." };

  await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId: id, userId: user.id } },
    create: { announcementId: id, userId: user.id },
    update: { readAt: new Date() },
  });

  revalidateAnnouncements();
  return { success: true };
}

export async function getAnnouncementsForUser(
  actor: { id: string; schoolId: string | null },
  userId: string,
  schoolId: string | null,
  classIds?: string[] | null
) {
  if (actor.id !== userId) return [];
  if (!schoolId || actor.schoolId !== schoolId) return [];

  const uniqueClassIds = [...new Set((classIds ?? []).filter(Boolean))];

  const announcements = await prisma.announcement.findMany({
    where: {
      schoolId,
      OR: [{ classId: null }, ...uniqueClassIds.map((classId) => ({ classId }))],
    },
    include: {
      author: { select: { fullName: true } },
      classGroup: { select: { name: true } },
      reads: { where: { userId }, select: { readAt: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  return announcements.map((a) => ({
    ...a,
    isRead: a.reads.length > 0,
  }));
}
