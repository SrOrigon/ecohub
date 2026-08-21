/** Detecta PostgreSQL gerenciado (Railway) vs SQLite em arquivo. */

const POSTGRES_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "DATABASE_PRIVATE_URL",
  "DATABASE_PUBLIC_URL",
  "POSTGRES_DATABASE_URL",
];

export function isPostgresUrl(url) {
  if (!url?.trim()) return false;
  return /^(postgres(ql)?(\+[a-z0-9-]+)?:\/\/)/i.test(url.trim());
}

export function collectPostgresUrl() {
  for (const key of POSTGRES_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (isPostgresUrl(value)) return value;
  }
  return null;
}

export function isSqliteFileUrl(url) {
  return !!url?.trim().startsWith("file:");
}

/** Prisma resolve SQLite relativo à pasta `prisma/` — corrige path legado duplicado. */
export function normalizeSqliteDatabaseUrl(url) {
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

/**
 * URL canônica em produção: Postgres se existir; senão SQLite em /data.
 * Nunca substitui uma URL Postgres por arquivo SQLite.
 */
export function resolveDurableDatabaseUrl(sqliteFallback = "file:/data/prod.db") {
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

export function applyDurableDatabaseUrl() {
  const resolved = resolveDurableDatabaseUrl();
  process.env.DATABASE_URL = resolved;
  return resolved;
}
