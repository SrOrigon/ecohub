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
import type { AttentionAlertsSnapshot } from "@/lib/attention-alerts";

export type AttentionConnectionStatus = "connecting" | "live" | "polling" | "offline";

type AttentionAlertsContextValue = {
  snapshot: AttentionAlertsSnapshot | null;
  status: AttentionConnectionStatus;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
};

const AttentionAlertsContext = createContext<AttentionAlertsContextValue | null>(null);

export function useAttentionAlerts() {
  const ctx = useContext(AttentionAlertsContext);
  if (!ctx) {
    throw new Error("useAttentionAlerts must be used within AttentionAlertsProvider");
  }
  return ctx;
}

export function useAttentionAlertsOptional() {
  return useContext(AttentionAlertsContext);
}

async function fetchSnapshot(): Promise<AttentionAlertsSnapshot> {
  const res = await fetch("/api/alerts/attention", { cache: "no-store" });
  if (!res.ok) throw new Error("alerts_fetch_failed");
  return res.json();
}

export function AttentionAlertsProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AttentionAlertsSnapshot | null>(null);
  const [status, setStatus] = useState<AttentionConnectionStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applySnapshot = useCallback((data: AttentionAlertsSnapshot) => {
    setSnapshot(data);
    setLastUpdated(new Date(data.updatedAt));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchSnapshot();
      applySnapshot(data);
      setStatus((s) => (s === "offline" ? "polling" : s));
    } catch {
      setStatus("offline");
    }
  }, [applySnapshot]);

  useEffect(() => {
    let mounted = true;

    const startPolling = () => {
      if (pollRef.current) return;
      setStatus("polling");
      void refresh();
      pollRef.current = setInterval(() => void refresh(), 15_000);
    };

    const connectSSE = () => {
      if (typeof EventSource === "undefined") {
        startPolling();
        return;
      }

      try {
        const es = new EventSource("/api/alerts/stream");
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!mounted) return;
          setStatus("live");
        };

        es.onmessage = (event) => {
          if (!mounted) return;
          try {
            const data = JSON.parse(event.data) as AttentionAlertsSnapshot;
            applySnapshot(data);
            setStatus("live");
          } catch {
            /* ignore malformed */
          }
        };

        es.onerror = () => {
          if (!mounted) return;
          es.close();
          eventSourceRef.current = null;
          startPolling();
        };
      } catch {
        startPolling();
      }
    };

    connectSSE();

    return () => {
      mounted = false;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [applySnapshot, refresh]);

  const value = useMemo(
    () => ({ snapshot, status, lastUpdated, refresh }),
    [snapshot, status, lastUpdated, refresh]
  );

  return (
    <AttentionAlertsContext.Provider value={value}>{children}</AttentionAlertsContext.Provider>
  );
}
