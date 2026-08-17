"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LiveUiStatus = "connecting" | "live" | "updating" | "offline";

const CLIENT_POLL_MS = 90_000;
const CACHE_MAX_AGE_MS = 3 * 60_000;
const UPDATING_FLASH_MS = 1_600;
const SSE_RETRY_MS = 8_000;

type CachedEnvelope<T> = {
  savedAt: number;
  data: T;
};

/** Fallback quando sessionStorage falha (Safari privado, WebView, cota). */
const memoryCache = new Map<string, CachedEnvelope<unknown>>();

function canUseSessionStorage(): boolean {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return false;
    const probe = "__ecohub_cache__";
    window.sessionStorage.setItem(probe, "1");
    window.sessionStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function readCache<T>(key: string): CachedEnvelope<T> | null {
  const fromMemory = memoryCache.get(key) as CachedEnvelope<T> | undefined;
  if (fromMemory && Date.now() - fromMemory.savedAt <= CACHE_MAX_AGE_MS) {
    return fromMemory;
  }

  if (!canUseSessionStorage()) return fromMemory ?? null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fromMemory ?? null;
    const parsed = JSON.parse(raw) as CachedEnvelope<T>;
    if (!parsed?.data || typeof parsed.savedAt !== "number") return fromMemory ?? null;
    if (Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) return fromMemory ?? null;
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return fromMemory ?? null;
  }
}

function writeCache<T>(key: string, data: T) {
  const envelope: CachedEnvelope<T> = { savedAt: Date.now(), data };
  memoryCache.set(key, envelope);
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* quota / modo privado */
  }
}

function isForeground(): boolean {
  if (typeof document === "undefined") return true;
  if (document.visibilityState === "hidden") return false;
  return true;
}

export function useCachedLiveSource<T>(options: {
  storageKey: string;
  fetchSnapshot: () => Promise<T | null>;
  streamUrl: string;
  getVersion: (data: T) => string;
  pollMs?: number;
}) {
  const { storageKey, fetchSnapshot, streamUrl, getVersion, pollMs = CLIENT_POLL_MS } = options;

  const [snapshot, setSnapshot] = useState<T | null>(null);
  const [status, setStatus] = useState<LiveUiStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const versionRef = useRef("");
  const mountedRef = useRef(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchRef = useRef(fetchSnapshot);
  const versionFnRef = useRef(getVersion);
  fetchRef.current = fetchSnapshot;
  versionFnRef.current = getVersion;

  const applySnapshot = useCallback(
    (data: T, fromNetwork: boolean) => {
      const version = versionFnRef.current(data);
      const changed = version !== versionRef.current && versionRef.current !== "";
      versionRef.current = version;
      setSnapshot(data);
      setLastUpdated(new Date());
      writeCache(storageKey, data);

      if (fromNetwork && changed) {
        setStatus("updating");
        if (flashRef.current) clearTimeout(flashRef.current);
        flashRef.current = setTimeout(() => {
          if (mountedRef.current) setStatus("live");
        }, UPDATING_FLASH_MS);
      } else if (mountedRef.current) {
        setStatus((s) => (s === "updating" ? s : "live"));
      }
    },
    [storageKey]
  );

  const refresh = useCallback(async () => {
    if (!isForeground()) return;
    try {
      const data = await fetchRef.current();
      if (!mountedRef.current) return;
      if (data) applySnapshot(data, true);
      else if (!versionRef.current) setStatus("offline");
    } catch {
      if (mountedRef.current && !versionRef.current) setStatus("offline");
    }
  }, [applySnapshot]);

  useEffect(() => {
    mountedRef.current = true;
    const cached = readCache<T>(storageKey);
    if (cached?.data) {
      versionRef.current = versionFnRef.current(cached.data);
      setSnapshot(cached.data);
      setLastUpdated(new Date(cached.savedAt));
      setStatus("live");
    }

    return () => {
      mountedRef.current = false;
      if (flashRef.current) clearTimeout(flashRef.current);
    };
  }, [storageKey]);

  useEffect(() => {
    const stopPoll = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const stopRetry = () => {
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
    };

    const closeSSE = () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };

    const startPolling = () => {
      if (pollRef.current) return;
      void refresh();
      pollRef.current = setInterval(() => {
        if (isForeground()) void refresh();
      }, pollMs);
    };

    const connectSSE = () => {
      if (!isForeground()) return;
      if (typeof EventSource === "undefined") {
        startPolling();
        return;
      }
      if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
        return;
      }

      closeSSE();
      try {
        const es = new EventSource(streamUrl, { withCredentials: true });
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!mountedRef.current) return;
          stopPoll();
          setStatus((s) => (s === "updating" ? s : "live"));
        };

        es.onmessage = (event) => {
          if (!mountedRef.current) return;
          try {
            applySnapshot(JSON.parse(event.data) as T, true);
          } catch {
            /* ignore */
          }
        };

        es.onerror = () => {
          if (!mountedRef.current) return;
          // Celular: o navegador reconecta sozinho enquanto CONNECTING.
          if (es.readyState === EventSource.CONNECTING) return;
          closeSSE();
          startPolling();
          stopRetry();
          retryRef.current = setTimeout(() => {
            if (mountedRef.current && isForeground()) connectSSE();
          }, SSE_RETRY_MS);
        };
      } catch {
        startPolling();
      }
    };

    if (!readCache<T>(storageKey)?.data) void refresh();
    connectSSE();

    const onForeground = () => {
      if (!isForeground()) return;
      const envelope = readCache<T>(storageKey);
      const age = envelope ? Date.now() - envelope.savedAt : CACHE_MAX_AGE_MS;
      if (age > pollMs) void refresh();
      connectSSE();
    };

    const onBackground = () => {
      closeSSE();
      stopPoll();
      stopRetry();
    };

    const onOffline = () => {
      if (mountedRef.current && !versionRef.current) setStatus("offline");
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") onForeground();
      else onBackground();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onForeground);
    window.addEventListener("pagehide", onBackground);
    window.addEventListener("online", onForeground);
    window.addEventListener("offline", onOffline);
    document.addEventListener("freeze", onBackground);
    document.addEventListener("resume", onForeground);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onForeground);
      window.removeEventListener("pagehide", onBackground);
      window.removeEventListener("online", onForeground);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("freeze", onBackground);
      document.removeEventListener("resume", onForeground);
      closeSSE();
      stopPoll();
      stopRetry();
    };
  }, [applySnapshot, pollMs, refresh, storageKey, streamUrl]);

  return { snapshot, status, lastUpdated, refresh };
}
