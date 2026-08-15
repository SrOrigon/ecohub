/** Detecta PostgreSQL gerenciado (Railway) vs SQLite em arquivo. */

const POSTGRES_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "DATABASE_PRIVATE_URL",
  "DATABASE_PUBLIC_URL",
  "POSTGRES_DATABASE_URL",
] as const;

export function isPostgresUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  return /^(postgres(ql)?(\+[a-z0-9-]+)?:\/\/)/i.test(url.trim());
}

export function collectPostgresUrl(): string | null {
  for (const key of POSTGRES_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value && isPostgresUrl(value)) return value;
  }
  return null;
}

export function isSqliteFileUrl(url?: string | null): boolean {
  return !!url?.trim().startsWith("file:");
}

export function resolveDurableDatabaseUrl(sqliteFallback = "file:/data/prod.db"): string {
  const postgres = collectPostgresUrl();
  if (postgres) return postgres;

  const current = process.env.DATABASE_URL?.trim();
  if (current && isSqliteFileUrl(current)) return current;
  if (current && !isPostgresUrl(current) && !isSqliteFileUrl(current)) {
    return current;
  }

  if (process.env.NODE_ENV === "production") return sqliteFallback;
  return current || "file:./prisma/dev.db";
}

export function applyDurableDatabaseUrl(): string {
  const resolved = resolveDurableDatabaseUrl();
  process.env.DATABASE_URL = resolved;
  return resolved;
}

export function isManagedPostgres(): boolean {
  return collectPostgresUrl() !== null;
}
