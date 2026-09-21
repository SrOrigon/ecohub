export interface SnapshotItem<T> {
  data: T;
  timestamp: number;
  ttlMs?: number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export function saveOfflineSnapshot<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  if (typeof window === "undefined") return;
  try {
    const item: SnapshotItem<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };
    localStorage.setItem(`ecohub_offline_${key}`, JSON.stringify(item));
  } catch (e) {
    console.warn("[offline-storage] Falha ao salvar snapshot offline:", e);
  }
}

export function getOfflineSnapshot<T>(
  key: string
): { data: T; isExpired: boolean; timestamp: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`ecohub_offline_${key}`);
    if (!raw) return null;
    const item: SnapshotItem<T> = JSON.parse(raw);
    const age = Date.now() - item.timestamp;
    const maxAge = item.ttlMs ?? DEFAULT_TTL_MS;
    return {
      data: item.data,
      isExpired: age > maxAge,
      timestamp: item.timestamp,
    };
  } catch (e) {
    console.warn("[offline-storage] Falha ao ler snapshot offline:", e);
    return null;
  }
}

export function clearOfflineSnapshot(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`ecohub_offline_${key}`);
  } catch {
    /* ignore */
  }
}
