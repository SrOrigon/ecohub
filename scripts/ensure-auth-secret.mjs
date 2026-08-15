import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { AUTH_SECRET_FILE } from "./lib/paths.mjs";

const SECRET_PATH = AUTH_SECRET_FILE;

const PLACEHOLDER_SECRETS = new Set([
  "gere-um-segredo-longo-e-aleatorio-min-32-chars",
  "ecohub-build-placeholder-secret-do-not-use-at-runtime-32",
  "ecohub-dev-secret-change-in-production",
]);

function isUsableSecret(value) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length >= 32 && !PLACEHOLDER_SECRETS.has(trimmed);
}

function persistSecretToVolume(secret, source) {
  try {
    mkdirSync(dirname(SECRET_PATH), { recursive: true });
    writeFileSync(SECRET_PATH, `${secret}\n`, { mode: 0o600 });
    console.log(`[ecohub] AUTH_SECRET (${source}) salvo em`, SECRET_PATH);
  } catch (error) {
    console.warn(
      "[ecohub] Não foi possível salvar AUTH_SECRET no volume:",
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * Garante AUTH_SECRET válido antes de subir o Next.js em produção.
 * Ordem: arquivo no volume → variável de ambiente válida → geração automática.
 */
export function ensureAuthSecret() {
  if (existsSync(SECRET_PATH)) {
    const fromFile = readFileSync(SECRET_PATH, "utf8").trim();
    if (isUsableSecret(fromFile)) {
      process.env.AUTH_SECRET = fromFile;
      console.log("[ecohub] AUTH_SECRET carregado de", SECRET_PATH);
      return fromFile;
    }
  }

  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (isUsableSecret(fromEnv)) {
    persistSecretToVolume(fromEnv, "variável de ambiente");
    process.env.AUTH_SECRET = fromEnv;
    return fromEnv;
  }

  if (fromEnv && !isUsableSecret(fromEnv)) {
    console.warn(
      "[ecohub] AUTH_SECRET da variável de ambiente ignorado (placeholder ou curto demais)."
    );
  }

  const generated = randomBytes(48).toString("base64");
  persistSecretToVolume(generated, "gerado");
  process.env.AUTH_SECRET = generated;
  return generated;
}
