"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AttentionAlertsSnapshot } from "@/lib/attention-alerts";
import { useCachedLiveSource, type LiveUiStatus } from "@/lib/page-live-cache";

export type AttentionConnectionStatus = LiveUiStatus;

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
    const res = await fetch("/api/alerts/attention");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function AttentionAlertsProvider({ children }: { children: ReactNode }) {
  const live = useCachedLiveSource<AttentionAlertsSnapshot>({
    storageKey: "ecohub:live:alerts",
    fetchSnapshot,
    streamUrl: "/api/alerts/stream",
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

  return <AttentionAlertsContext.Provider value={value}>{children}</AttentionAlertsContext.Provider>;
}
