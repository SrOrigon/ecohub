import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const SECRET_PATH = process.env.ECOHUB_AUTH_SECRET_FILE?.trim() || "/data/.auth_secret";

/**
 * Garante AUTH_SECRET válido antes de subir o Next.js em produção.
 * Ordem: variável de ambiente → arquivo no volume → geração automática.
 */
export function ensureAuthSecret() {
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) {
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
    mkdirSync(dirname(SECRET_PATH), { recursive: true });
    writeFileSync(SECRET_PATH, `${generated}\n`, { mode: 0o600 });
    console.log("[ecohub] AUTH_SECRET gerado e salvo em", SECRET_PATH);
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
