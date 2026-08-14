const BUILD_FALLBACK =
  "ecohub-build-placeholder-secret-do-not-use-at-runtime-32";

function isNextBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/**
 * Segredo JWT. Em produção AUTH_SECRET é obrigatório: sem ele, o fallback público
 * deste arquivo permitiria a qualquer pessoa forjar cookies de sessão.
 */
export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();

  if (secret && secret.length >= 32) {
    return new TextEncoder().encode(secret);
  }

  // Durante o build não há requisições reais; o placeholder só evita quebrar a
  // pré-renderização de páginas que importam o módulo de sessão.
  if (isNextBuildPhase()) {
    return new TextEncoder().encode(BUILD_FALLBACK);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET ausente ou muito curto. Defina uma chave com pelo menos 32 caracteres nas variáveis de ambiente de produção."
    );
  }

  return new TextEncoder().encode("ecohub-dev-secret-change-in-production");
}
