const BUILD_FALLBACK =
  "eduhub-build-placeholder-secret-do-not-use-at-runtime-32";

function isNextBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/** Segredo JWT — exige AUTH_SECRET em produção (exceto fase de build). */
export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();

  if (secret && secret.length >= 32) {
    return new TextEncoder().encode(secret);
  }

  if (isNextBuildPhase()) {
    return new TextEncoder().encode(BUILD_FALLBACK);
  }

  if (process.env.NODE_ENV === "production") {
    return new TextEncoder().encode(BUILD_FALLBACK);
  }

  return new TextEncoder().encode("eduhub-dev-secret-change-in-production");
}
