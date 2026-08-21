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

/**
 * Prisma resolve caminhos SQLite relativos à pasta do schema (`prisma/`).
 * `file:./prisma/dev.db` acabava em `prisma/prisma/dev.db` (banco vazio, dados "sumiam").
 */
export function normalizeSqliteDatabaseUrl(url: string): string {
  const trimmed = url.trim();
  if (
    trimmed === "file:./prisma/dev.db" ||
    trimmed === "file:prisma/dev.db" ||
    trimmed === "file:./prisma\\dev.db"
  ) {
    return "file:./dev.db";
  }
  return trimmed;
}

export function resolveDurableDatabaseUrl(sqliteFallback = "file:/data/prod.db"): string {
  const postgres = collectPostgresUrl();
  if (postgres) return postgres;

  const current = process.env.DATABASE_URL?.trim();
  if (current && isSqliteFileUrl(current)) return normalizeSqliteDatabaseUrl(current);
  if (current && !isPostgresUrl(current) && !isSqliteFileUrl(current)) {
    return current;
  }

  if (process.env.NODE_ENV === "production") return sqliteFallback;
  return current ? normalizeSqliteDatabaseUrl(current) : "file:./dev.db";
}

export function applyDurableDatabaseUrl(): string {
  const resolved = resolveDurableDatabaseUrl();
  process.env.DATABASE_URL = resolved;
  return resolved;
}

export function isManagedPostgres(): boolean {
  return collectPostgresUrl() !== null;
}
