"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";
import { useNotifications } from "@/components/notifications/notifications-provider";
import type { NotificationSnapshotItem } from "@/lib/notification-snapshot";

export function NotificationBell() {
  const { unreadCount, items, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleToggle() {
    setOpen((prev) => {
      const next = !prev;
      if (next) void refresh();
      return next;
    });
  }

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
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsReadAction();
      await refresh();
    } finally {
      if (mountedRef.current) setMarkingAll(false);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleToggle}
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
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] max-sm:fixed max-sm:right-3 max-sm:top-[calc(var(--app-header-offset)+0.35rem)] max-sm:left-3 max-sm:mt-0 max-sm:w-auto max-sm:max-w-none">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
            <p className="font-semibold text-[var(--foreground)]">Notificações</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={markingAll}
                className="text-xs font-medium text-[color:var(--school-primary)] hover:underline disabled:opacity-50"
              >
                {markingAll ? "Marcando..." : "Marcar todas como lidas"}
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
                <NotificationRow item={n} onRead={refresh} />
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
  item: NotificationSnapshotItem;
  onRead: () => void;
}) {
  const router = useRouter();

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
        {!item.isRead && (
          <Badge variant="default" className="shrink-0 text-xs">
            Nova
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.message}</p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)] opacity-70">{formatDate(item.createdAt)}</p>
    </div>
  );

  if (item.href) {
    const href = item.href;
    return (
      <Link
        href={href}
        onClick={(event) => {
          event.preventDefault();
          void markRead().finally(() => router.push(href));
        }}
        className="block hover:bg-[var(--hover)]"
      >
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
