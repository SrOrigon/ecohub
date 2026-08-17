/**
 * Cache em memória do processo (Railway / Node).
 *
 * Não é fonte da verdade: logins e cadastros continuam só no Postgres.
 * Serve para leituras repetidas (escola, configurações, totais do painel)
 * e para aliviar o banco com o uso contínuo.
 *
 * Em deploy o cache zera — os dados permanecem no volume Postgres.
 */

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const MAX_ENTRIES = 800;
const store = new Map<string, CacheEntry>();

let hits = 0;
let misses = 0;

function evictExpired(now: number) {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}

function touchLru(key: string, entry: CacheEntry) {
  store.delete(key);
  store.set(key, entry);
}

function evictOldest() {
  if (store.size < MAX_ENTRIES) return;
  const oldest = store.keys().next().value;
  if (oldest) store.delete(oldest);
}

export function cacheGet<T>(key: string): T | undefined {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) {
    misses += 1;
    return undefined;
  }
  if (entry.expiresAt <= now) {
    store.delete(key);
    misses += 1;
    return undefined;
  }
  touchLru(key, entry);
  hits += 1;
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  const now = Date.now();
  if (store.size > MAX_ENTRIES * 1.2) evictExpired(now);
  evictOldest();
  store.set(key, { value, expiresAt: now + Math.max(1_000, ttlMs) });
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

export function cacheDeletePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export async function cacheGetOrSet<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== undefined) return cached;
  const value = await loader();
  cacheSet(key, value, ttlMs);
  return value;
}

export const CACHE_TTL = {
  schoolSlug: 60_000,
  schoolRecord: 60_000,
  schoolSettings: 45_000,
  dashboardStats: 15_000,
  liveSnapshot: 20_000,
  notifications: 15_000,
  attentionAlerts: 30_000,
} as const;

/** Invalida leituras da escola após gravar no banco (aluno, professor, config). */
export function invalidateSchoolCaches(schoolId?: string | null, slug?: string | null) {
  if (schoolId) {
    cacheDeletePrefix(`school:${schoolId}:`);
    cacheDeletePrefix(`live:${schoolId}:`);
  }
  if (slug) cacheDelete(`school:slug:${slug.trim().toLowerCase()}`);
}

export function cacheStats() {
  const total = hits + misses;
  return {
    entries: store.size,
    hits,
    misses,
    hitRate: total === 0 ? 0 : Math.round((hits / total) * 1000) / 10,
    maxEntries: MAX_ENTRIES,
    durable: false as const,
    note: "Cache só acelera leitura. Contas ficam no Postgres.",
  };
}
