const BUILD_FALLBACK =
  "ecohub-build-placeholder-secret-do-not-use-at-runtime-32";

function isNextBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/**
 * Segredo JWT. Em produção, `scripts/start-production.mjs` garante AUTH_SECRET
 * (variável de ambiente ou arquivo /data/.auth_secret) antes de subir o Next.js.
 */
export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();

  if (secret && secret.length >= 32) {
    return new TextEncoder().encode(secret);
  }

  if (isNextBuildPhase()) {
    return new TextEncoder().encode(BUILD_FALLBACK);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET ausente. Reinicie o serviço — o startup deve gerar o segredo automaticamente."
    );
  }

  return new TextEncoder().encode("ecohub-dev-secret-change-in-production");
}
