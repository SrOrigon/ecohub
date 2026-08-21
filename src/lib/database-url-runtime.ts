/**
 * Garante DATABASE_URL durável: PostgreSQL gerenciado ou SQLite em /data.
 * Nunca troca uma URL Postgres por arquivo SQLite.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  applyDurableDatabaseUrl,
  isPostgresUrl,
  isSqliteFileUrl,
  normalizeSqliteDatabaseUrl,
} from "@/lib/database-mode";
import { PRODUCTION_DATABASE_URL } from "@/lib/production-database";

const DATABASE_URL_FILE =
  process.env.ECOHUB_DATABASE_URL_FILE?.trim() || "/data/.database_url";

function readPersistedDatabaseUrl(): string | null {
  try {
    if (!existsSync(/* turbopackIgnore: true */ DATABASE_URL_FILE)) return null;
    const url = readFileSync(/* turbopackIgnore: true */ DATABASE_URL_FILE, "utf8").trim();
    if (isPostgresUrl(url)) return url;
    if (url.startsWith("file:/data/")) return url;
    return null;
  } catch {
    return null;
  }
}

export function persistDatabaseUrl(url: string) {
  try {
    mkdirSync(dirname(DATABASE_URL_FILE), { recursive: true });
    writeFileSync(DATABASE_URL_FILE, `${url}\n`, "utf8");
  } catch {
    /* volume opcional */
  }
}

export function ensureDatabaseUrlAtRuntime(): string {
  if (process.env.NODE_ENV !== "production") {
    const dev = process.env.DATABASE_URL?.trim() || "file:./dev.db";
    const normalized = isSqliteFileUrl(dev) ? normalizeSqliteDatabaseUrl(dev) : dev;
    process.env.DATABASE_URL = normalized;
    return normalized;
  }

  const fromEnv = applyDurableDatabaseUrl();
  if (isPostgresUrl(fromEnv)) {
    persistDatabaseUrl(fromEnv);
    return fromEnv;
  }

  const persisted = readPersistedDatabaseUrl();
  if (persisted && isPostgresUrl(persisted)) {
    process.env.DATABASE_URL = persisted;
    return persisted;
  }

  const canonical =
    persisted && isSqliteFileUrl(persisted) ? persisted : fromEnv || PRODUCTION_DATABASE_URL;
  process.env.DATABASE_URL = canonical;
  persistDatabaseUrl(canonical);
  return canonical;
}
