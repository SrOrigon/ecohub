const BUILD_FALLBACK =
  "eduhub-build-placeholder-secret-do-not-use-at-runtime-32";

/** Segredo estável para demo/Railway quando AUTH_SECRET não está nas Variables. */
export const DEMO_AUTH_SECRET =
  "eduhub-railway-demo-auth-secret-v1-min-32-chars";

function isNextBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function isDemoMode(): boolean {
  return (
    process.env.EDUHUB_ENABLE_DEMO === "1" || process.env.EDUHUB_ENABLE_DEMO === "true"
  );
}

/** Segredo JWT — fallback demo só em EDUHUB_ENABLE_DEMO ou fase de build. */
export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();

  if (!secret || secret.length < 32) {
    if (
      process.env.NODE_ENV === "production" &&
      !isNextBuildPhase() &&
      isDemoMode()
    ) {
      return new TextEncoder().encode(DEMO_AUTH_SECRET);
    }
    return new TextEncoder().encode(
      process.env.NODE_ENV === "production" ? BUILD_FALLBACK : "eduhub-dev-secret-change-in-production"
    );
  }

  return new TextEncoder().encode(secret);
}
