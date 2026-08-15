import { prisma } from "@/lib/db";

export type NotificationSnapshotItem = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationSnapshot = {
  unreadCount: number;
  latestId: string | null;
  items: NotificationSnapshotItem[];
  updatedAt: string;
};

export async function getNotificationSnapshot(
  userId: string,
  limit = 8
): Promise<NotificationSnapshot> {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    unreadCount,
    latestId: items[0]?.id ?? null,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      href: item.href,
      isRead: item.isRead,
      createdAt: item.createdAt.toISOString(),
    })),
    updatedAt: new Date().toISOString(),
  };
}
