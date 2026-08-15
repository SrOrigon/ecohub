/**
 * Garante que o Next.js use sempre o banco no volume /data em produção.
 * Sem isso, cadastros podem ir para disco efêmero e sumir no redeploy.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const DEFAULT_DATABASE_URL = "file:/data/prod.db";
const DATABASE_URL_FILE =
  process.env.ECOHUB_DATABASE_URL_FILE?.trim() || "/data/.database_url";

function readPersistedDatabaseUrl(): string | null {
  try {
    if (!existsSync(/* turbopackIgnore: true */ DATABASE_URL_FILE)) return null;
    const url = readFileSync(/* turbopackIgnore: true */ DATABASE_URL_FILE, "utf8").trim();
    return url.startsWith("file:/data/") ? url : null;
  } catch {
    return null;
  }
}

export function persistDatabaseUrl(url: string) {
  try {
    mkdirSync(dirname(DATABASE_URL_FILE), { recursive: true });
    writeFileSync(DATABASE_URL_FILE, `${url}\n`, "utf8");
  } catch {
    /* volume opcional em dev */
  }
}

export function ensureDatabaseUrlAtRuntime(): string {
  if (process.env.NODE_ENV !== "production") {
    return process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db";
  }

  const persisted = readPersistedDatabaseUrl();
  const canonical = persisted ?? DEFAULT_DATABASE_URL;
  const current = process.env.DATABASE_URL?.trim();
  const currentPath = current?.replace(/^file:/, "") ?? "";

  if (!currentPath.startsWith("/data/")) {
    console.warn(
      "[ecohub] DATABASE_URL fora do volume /data — usando",
      canonical,
      "(evita perda de logins no redeploy)"
    );
  }

  process.env.DATABASE_URL = canonical;
  persistDatabaseUrl(canonical);
  return canonical;
}
