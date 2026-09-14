"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import type { NotificationSnapshotItem } from "@/lib/notification-snapshot";
import { useNotifications } from "./notifications-provider";

export function LiveToast() {
  const [toast, setToast] = useState<NotificationSnapshotItem | null>(null);
  const { refresh } = useNotifications();

  useEffect(() => {
    let evtSource: EventSource | null = null;
    let mounted = true;

    async function init() {
      try {
        evtSource = new EventSource("/api/notifications/stream");

        evtSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "new_notification") {
              const notification: NotificationSnapshotItem = data.notification;
              setToast(notification);
              if (refresh) refresh();
              setTimeout(() => {
                if (mounted) setToast(null);
              }, 6000);
            }
          } catch (e) {
            console.error(e);
          }
        };

      } catch (err) {
        console.error(err);
      }
    }

    init();

    return () => {
      mounted = false;
      if (evtSource) {
        evtSource.close();
      }
    };
  }, [refresh]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[99] flex w-[min(22rem,calc(100vw-1.5rem))] animate-fade-in-up flex-col rounded-xl border border-indigo-200 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-indigo-900 dark:bg-slate-900/95">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-full bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{toast.title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{toast.message}</p>
          <div className="mt-3 flex gap-2">
            <Link
              href={toast.href || "/dashboard/notificacoes"}
              className="inline-flex h-8 items-center justify-center rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-700"
              onClick={() => setToast(null)}
            >
              Ver Detalhes
            </Link>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900"
            >
              Fechar
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setToast(null)}
          className="absolute right-2 top-2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
