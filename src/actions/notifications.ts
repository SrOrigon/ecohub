"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function revalidateNotifications() {
  revalidatePath("/dashboard/notificacoes");
  revalidatePath("/dashboard", "layout");
}

export async function getNotifications(limit = 20) {
  const user = await getSessionUser();
  if (!user) return { items: [], unreadCount: 0 };

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return { items, unreadCount };
}

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireSession();
  const id = String(formData.get("id") ?? "");

  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { isRead: true },
  });

  revalidateNotifications();
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const user = await requireSession();

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  revalidateNotifications();
  return { success: true };
}
