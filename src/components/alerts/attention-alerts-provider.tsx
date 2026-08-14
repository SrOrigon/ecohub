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

async function fetchSnapshot(): Promise<AttentionAlertsSnapshot | null> {
  try {
    const res = await fetch("/api/alerts/attention", { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function AttentionAlertsProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AttentionAlertsSnapshot | null>(null);
  const [status, setStatus] = useState<AttentionConnectionStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applySnapshot = useCallback((data: AttentionAlertsSnapshot) => {
    setSnapshot(data);
    setLastUpdated(new Date(data.updatedAt));
  }, []);

  const refresh = useCallback(async () => {
    const data = await fetchSnapshot();
    // A requisição pode terminar depois que o provider saiu da árvore.
    if (!mountedRef.current) return;
    if (data) {
      applySnapshot(data);
      setStatus((s) => (s === "offline" ? "polling" : s));
    } else {
      setStatus("offline");
    }
  }, [applySnapshot]);

  useEffect(() => {
    let mounted = true;

    const startPolling = () => {
      if (pollRef.current) return;
      setStatus("polling");
      void refresh();
      pollRef.current = setInterval(() => void refresh(), 45_000);
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
