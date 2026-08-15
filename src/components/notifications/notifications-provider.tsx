"use client";

import {
  createContext,
  useCallback,
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
    const res = await fetch("/api/notifications/live", { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<NotificationSnapshot | null>(null);
  const [toast, setToast] = useState<NotificationSnapshotItem | null>(null);
  const lastSeenId = useRef<string | null>(null);
  const hydrated = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const showToast = useCallback((item: NotificationSnapshotItem) => {
    setToast(item);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      if (mountedRef.current) setToast(null);
    }, 8_000);
  }, []);

  const applySnapshot = useCallback(
    (data: NotificationSnapshot) => {
      const previousId = lastSeenId.current;
      setSnapshot(data);

      const newestUnread = data.items.find((item) => !item.isRead) ?? data.items[0] ?? null;
      if (!hydrated.current) {
        hydrated.current = true;
        lastSeenId.current = data.latestId;
        if (newestUnread && data.unreadCount > 0) {
          showToast(newestUnread);
        }
        return;
      }

      if (data.latestId && data.latestId !== previousId && newestUnread && !newestUnread.isRead) {
        showToast(newestUnread);
      }
      lastSeenId.current = data.latestId;
    },
    [showToast]
  );

  const refresh = useCallback(async () => {
    const data = await fetchSnapshot();
    if (!mountedRef.current || !data) return;
    applySnapshot(data);
  }, [applySnapshot]);

  useEffect(() => {
    const startPolling = () => {
      if (pollRef.current) return;
      void refresh();
      pollRef.current = setInterval(() => void refresh(), 15_000);
    };

    const connectSSE = () => {
      if (typeof EventSource === "undefined") {
        startPolling();
        return;
      }

      try {
        const es = new EventSource("/api/notifications/stream");
        eventSourceRef.current = es;

        es.onmessage = (event) => {
          if (!mountedRef.current) return;
          try {
            applySnapshot(JSON.parse(event.data) as NotificationSnapshot);
          } catch {
            /* ignore */
          }
        };

        es.onerror = () => {
          es.close();
          eventSourceRef.current = null;
          startPolling();
        };
      } catch {
        startPolling();
      }
    };

    void refresh();
    connectSSE();

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      eventSourceRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [applySnapshot, refresh]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      unreadCount: snapshot?.unreadCount ?? 0,
      items: snapshot?.items ?? [],
      refresh,
    }),
    [snapshot, refresh]
  );

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
