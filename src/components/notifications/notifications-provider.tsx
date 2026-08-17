"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { NotificationSnapshot, NotificationSnapshotItem } from "@/lib/notification-snapshot";
import { useCachedLiveSource } from "@/lib/page-live-cache";

type NotificationsContextValue = {
  unreadCount: number;
  items: NotificationSnapshotItem[];
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}

export function useNotificationsOptional() {
  return useContext(NotificationsContext);
}

async function fetchSnapshot(): Promise<NotificationSnapshot | null> {
  try {
    const res = await fetch("/api/notifications/live");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const live = useCachedLiveSource<NotificationSnapshot>({
    storageKey: "ecohub:live:notify",
    fetchSnapshot,
    streamUrl: "/api/notifications/stream",
    getVersion: (data) => `${data.unreadCount}:${data.latestId ?? ""}`,
  });

  const [toast, setToast] = useState<NotificationSnapshotItem | null>(null);
  const lastSeenId = useRef<string | null>(null);
  const hydrated = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const data = live.snapshot;
    if (!data) return;

    const newestUnread = data.items.find((item) => !item.isRead) ?? data.items[0] ?? null;
    if (!hydrated.current) {
      hydrated.current = true;
      lastSeenId.current = data.latestId;
      return;
    }

    if (data.latestId && data.latestId !== lastSeenId.current && newestUnread && !newestUnread.isRead) {
      setToast(newestUnread);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 8_000);
    }
    lastSeenId.current = data.latestId;
  }, [live.snapshot]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({
      unreadCount: live.snapshot?.unreadCount ?? 0,
      items: live.snapshot?.items ?? [],
      refresh: live.refresh,
    }),
    [live.snapshot, live.refresh]
  );

  const snapshot = live.snapshot;

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      {snapshot && snapshot.unreadCount > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-14 z-40 flex justify-center px-3 md:top-16">
          <Link
            href="/dashboard/notificacoes"
            className="pointer-events-auto mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 shadow-sm dark:border-red-900 dark:bg-red-950/80 dark:text-red-100"
          >
            <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {snapshot.unreadCount === 1
                ? "1 notificação nova"
                : `${snapshot.unreadCount} notificações novas`}
            </span>
          </Link>
        </div>
      )}
      {toast && (
        <div className="fixed right-3 top-20 z-50 w-[min(22rem,calc(100vw-1.5rem))] md:top-24">
          <Link
            href={toast.href || "/dashboard/notificacoes"}
            onClick={() => setToast(null)}
            className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-md)]"
            role="status"
            aria-live="polite"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--school-primary)]">
              Nova notificação
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{toast.title}</p>
            <p className="mt-1 line-clamp-3 text-sm text-[var(--muted-foreground)]">{toast.message}</p>
          </Link>
        </div>
      )}
    </NotificationsContext.Provider>
  );
}
