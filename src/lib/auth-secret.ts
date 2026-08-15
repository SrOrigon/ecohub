import { ensureAuthSecretAtRuntime, isUsableAuthSecret } from "@/lib/auth-secret-runtime";

const BUILD_FALLBACK =
  "ecohub-build-placeholder-secret-do-not-use-at-runtime-32";

function isNextBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/**
 * Segredo JWT. Em produção, prioriza /data/.auth_secret (via instrumentation + startup).
 */
export function getAuthSecret(): Uint8Array {
  if (isNextBuildPhase()) {
    return new TextEncoder().encode(BUILD_FALLBACK);
  }

  if (!isUsableAuthSecret(process.env.AUTH_SECRET)) {
    ensureAuthSecretAtRuntime();
  }

  const secret = process.env.AUTH_SECRET?.trim();
  if (isUsableAuthSecret(secret)) {
    return new TextEncoder().encode(secret);
  }

  // Nunca derruba a página: gera um segredo em memória se o volume ainda não estiver pronto.
  const generated = ensureAuthSecretAtRuntime();
  return new TextEncoder().encode(generated);
}
