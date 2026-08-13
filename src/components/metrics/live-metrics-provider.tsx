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
import type { LiveMetricsSnapshot } from "@/lib/live-metrics";

export type LiveConnectionStatus = "connecting" | "live" | "polling" | "offline";

type LiveMetricsContextValue = {
  snapshot: LiveMetricsSnapshot | null;
  status: LiveConnectionStatus;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
};

const LiveMetricsContext = createContext<LiveMetricsContextValue | null>(null);

export function useLiveMetrics() {
  const ctx = useContext(LiveMetricsContext);
  if (!ctx) {
    throw new Error("useLiveMetrics must be used within LiveMetricsProvider");
  }
  return ctx;
}

export function useLiveMetricsOptional() {
  return useContext(LiveMetricsContext);
}

async function fetchSnapshot(): Promise<LiveMetricsSnapshot | null> {
  try {
    const res = await fetch("/api/metrics/live", { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function LiveMetricsProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<LiveMetricsSnapshot | null>(null);
  const [status, setStatus] = useState<LiveConnectionStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applySnapshot = useCallback((data: LiveMetricsSnapshot) => {
    setSnapshot(data);
    setLastUpdated(new Date(data.updatedAt));
  }, []);

  const refresh = useCallback(async () => {
    const data = await fetchSnapshot();
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
        const es = new EventSource("/api/metrics/stream");
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!mounted) return;
          setStatus("live");
        };

        es.onmessage = (event) => {
          if (!mounted) return;
          try {
            const data = JSON.parse(event.data) as LiveMetricsSnapshot;
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

  return <LiveMetricsContext.Provider value={value}>{children}</LiveMetricsContext.Provider>;
}
