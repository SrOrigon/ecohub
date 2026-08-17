"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { LiveMetricsSnapshot } from "@/lib/live-metrics";
import { useCachedLiveSource, type LiveUiStatus } from "@/lib/page-live-cache";

export type LiveConnectionStatus = LiveUiStatus;

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
    const res = await fetch("/api/metrics/live");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function LiveMetricsProvider({ children }: { children: ReactNode }) {
  const live = useCachedLiveSource<LiveMetricsSnapshot>({
    storageKey: "ecohub:live:metrics",
    fetchSnapshot,
    streamUrl: "/api/metrics/stream",
    getVersion: (data) => data.version,
  });

  const value = useMemo(
    () => ({
      snapshot: live.snapshot,
      status: live.status,
      lastUpdated: live.lastUpdated,
      refresh: live.refresh,
    }),
    [live.snapshot, live.status, live.lastUpdated, live.refresh]
  );

  return <LiveMetricsContext.Provider value={value}>{children}</LiveMetricsContext.Provider>;
}
