import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const AUTH_SECRET_FILE =
  process.env.ECOHUB_AUTH_SECRET_FILE?.trim() || "/data/.auth_secret";

const PLACEHOLDER_SECRETS = new Set([
  "gere-um-segredo-longo-e-aleatorio-min-32-chars",
  "ecohub-build-placeholder-secret-do-not-use-at-runtime-32",
  "ecohub-dev-secret-change-in-production",
]);

export function isUsableAuthSecret(value: string | undefined): value is string {
  const trimmed = value?.trim();
  return !!trimmed && trimmed.length >= 32 && !PLACEHOLDER_SECRETS.has(trimmed);
}

function readSecretFromFile(): string | null {
  try {
    if (!existsSync(/* turbopackIgnore: true */ AUTH_SECRET_FILE)) return null;
    const secret = readFileSync(/* turbopackIgnore: true */ AUTH_SECRET_FILE, "utf8").trim();
    return isUsableAuthSecret(secret) ? secret : null;
  } catch {
    return null;
  }
}

function persistSecretToFile(secret: string, source: string) {
  try {
    mkdirSync(dirname(AUTH_SECRET_FILE), { recursive: true });
    writeFileSync(AUTH_SECRET_FILE, `${secret}\n`, { mode: 0o600 });
    console.log(`[ecohub] AUTH_SECRET (${source}) persistido em ${AUTH_SECRET_FILE}`);
  } catch (error) {
    console.warn(
      "[ecohub] Não foi possível salvar AUTH_SECRET no volume:",
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * Fonte de verdade em produção: arquivo no volume (/data/.auth_secret).
 * Evita que variáveis placeholder do Railway invalidem login entre deploys.
 */
export function ensureAuthSecretAtRuntime(): string {
  const fromFile = readSecretFromFile();
  if (fromFile) {
    process.env.AUTH_SECRET = fromFile;
    return fromFile;
  }

  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (isUsableAuthSecret(fromEnv)) {
    persistSecretToFile(fromEnv, "variável de ambiente");
    return fromEnv;
  }

  if (process.env.NODE_ENV !== "production") {
    const devSecret = "ecohub-dev-secret-change-in-production";
    process.env.AUTH_SECRET = devSecret;
    return devSecret;
  }

  const generated = randomBytes(48).toString("base64");
  persistSecretToFile(generated, "gerado");
  process.env.AUTH_SECRET = generated;
  return generated;
}
