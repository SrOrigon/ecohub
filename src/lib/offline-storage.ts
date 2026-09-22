export interface SnapshotItem<T> {
  data: T;
  timestamp: number;
  ttlMs?: number;
}

export type MutationStatus = "pending" | "syncing" | "failed";

export interface PendingMutation {
  id: string;
  actionName: string;
  payload: Record<string, unknown>;
  schoolId?: string | null;
  createdAt: number;
  attempts: number;
  status: MutationStatus;
  lastError?: string;
}

const DB_NAME = "ecohub_offline_db";
const DB_VERSION = 1;
const MUTATIONS_STORE = "pending_mutations";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB não é suportado neste ambiente"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(MUTATIONS_STORE)) {
        const store = db.createObjectStore(MUTATIONS_STORE, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineMutation(
  actionName: string,
  payload: Record<string, unknown>,
  schoolId?: string | null
): Promise<PendingMutation> {
  const db = await openDB();
  const mutation: PendingMutation = {
    id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    actionName,
    payload,
    schoolId: schoolId ?? null,
    createdAt: Date.now(),
    attempts: 0,
    status: "pending",
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(MUTATIONS_STORE, "readwrite");
    const store = tx.objectStore(MUTATIONS_STORE);
    const req = store.add(mutation);

    req.onsuccess = () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ecohub_offline_mutations_changed"));
      }
      resolve(mutation);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MUTATIONS_STORE, "readonly");
      const store = tx.objectStore(MUTATIONS_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const items: PendingMutation[] = req.result || [];
        // Ordenar por ordem de criação (FIFO)
        items.sort((a, b) => a.createdAt - b.createdAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("[offline-storage] Falha ao ler mutações pendentes:", e);
    return [];
  }
}

export async function removeOfflineMutation(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MUTATIONS_STORE, "readwrite");
      const store = tx.objectStore(MUTATIONS_STORE);
      const req = store.delete(id);

      req.onsuccess = () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("ecohub_offline_mutations_changed"));
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("[offline-storage] Falha ao remover mutação:", e);
  }
}

export async function markMutationFailed(id: string, errorMsg?: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(MUTATIONS_STORE, "readwrite");
    const store = tx.objectStore(MUTATIONS_STORE);

    return new Promise((resolve, reject) => {
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item: PendingMutation | undefined = getReq.result;
        if (!item) {
          resolve();
          return;
        }

        item.attempts += 1;
        item.status = item.attempts >= 5 ? "failed" : "pending";
        item.lastError = errorMsg ?? "Falha na sincronização";

        const updateReq = store.put(item);
        updateReq.onsuccess = () => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("ecohub_offline_mutations_changed"));
          }
          resolve();
        };
        updateReq.onerror = () => reject(updateReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (e) {
    console.warn("[offline-storage] Falha ao marcar mutação como falhada:", e);
  }
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
