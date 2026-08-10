"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  getNotifications,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  isRead: boolean;
  createdAt: Date;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  async function load() {
    const data = await getNotifications(8);
    setItems(data.items);
    setUnreadCount(data.unreadCount);
  }

  useEffect(() => {
    const boot = setTimeout(() => {
      void load();
    }, 0);
    const interval = setInterval(() => void load(), 60000);
    return () => {
      clearTimeout(boot);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleMarkAll() {
    await markAllNotificationsReadAction();
    await load();
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="icon-btn relative"
        aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5 text-[var(--muted-foreground)]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
            <p className="font-semibold text-[var(--foreground)]">Notificações</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs font-medium text-[color:var(--school-primary)] hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                Nenhuma notificação ainda.
              </li>
            )}
            {items.map((n) => (
              <li key={n.id} className={!n.isRead ? "bg-[color:var(--school-primary-soft)]" : ""}>
                <NotificationRow item={n} onRead={load} />
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--border-subtle)] p-2">
            <Link
              href="/dashboard/notificacoes"
              className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-[color:var(--school-primary)] hover:bg-[var(--hover)]"
              onClick={() => setOpen(false)}
            >
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  item,
  onRead,
}: {
  item: NotificationItem;
  onRead: () => void;
}) {
  async function markRead() {
    const fd = new FormData();
    fd.set("id", item.id);
    await markNotificationReadAction(fd);
    onRead();
  }

  const content = (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
        {!item.isRead && <Badge variant="default" className="shrink-0 text-xs">Nova</Badge>}
      </div>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.message}</p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)] opacity-70">{formatDate(item.createdAt)}</p>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} onClick={markRead} className="block hover:bg-[var(--hover)]">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={markRead} className="block w-full text-left hover:bg-[var(--hover)]">
      {content}
    </button>
  );
}
