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
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white"
        aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5 text-slate-700" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-semibold text-slate-900">Notificações</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-500">Nenhuma notificação ainda.</li>
            )}
            {items.map((n) => (
              <li key={n.id} className={!n.isRead ? "bg-indigo-50/50" : ""}>
                <NotificationRow item={n} onRead={load} />
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 p-2">
            <Link
              href="/dashboard/notificacoes"
              className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-indigo-600 hover:bg-slate-50"
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
        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
        {!item.isRead && <Badge variant="default" className="shrink-0 text-xs">Nova</Badge>}
      </div>
      <p className="mt-1 text-sm text-slate-600">{item.message}</p>
      <p className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</p>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} onClick={markRead} className="block hover:bg-slate-50">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={markRead} className="block w-full text-left hover:bg-slate-50">
      {content}
    </button>
  );
}
