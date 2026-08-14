import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { AUTH_SECRET_FILE } from "./lib/paths.mjs";

const SECRET_PATH = AUTH_SECRET_FILE;

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
 * Ordem: variável de ambiente → arquivo no volume → geração automática.
 * O segredo no volume evita que logins parem de funcionar após redeploys.
 */
export function ensureAuthSecret() {
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) {
    if (!existsSync(SECRET_PATH)) {
      persistSecretToVolume(fromEnv, "variável de ambiente");
    }
    return fromEnv;
  }

  if (existsSync(SECRET_PATH)) {
    const fromFile = readFileSync(SECRET_PATH, "utf8").trim();
    if (fromFile.length >= 32) {
      process.env.AUTH_SECRET = fromFile;
      console.log("[ecohub] AUTH_SECRET carregado de", SECRET_PATH);
      return fromFile;
    }
  }

  const generated = randomBytes(48).toString("base64");
  try {
    persistSecretToVolume(generated, "gerado");
  } catch (error) {
    console.warn(
      "[ecohub] Não foi possível salvar AUTH_SECRET no volume — usando só nesta execução:",
      error instanceof Error ? error.message : error
    );
    console.warn(
      "[ecohub] Recomendado: monte volume em /data ou defina AUTH_SECRET nas variáveis do Railway."
    );
  }

  process.env.AUTH_SECRET = generated;
  return generated;
}
