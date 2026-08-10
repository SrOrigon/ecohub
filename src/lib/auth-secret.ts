const BUILD_FALLBACK =
  "eduhub-build-placeholder-secret-do-not-use-at-runtime-32";

function isNextBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/** Segredo JWT — lazy; tolera ausência de AUTH_SECRET apenas durante `next build`. */
export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === "production" && !isNextBuildPhase()) {
      throw new Error("AUTH_SECRET must be set in production");
    }
    return new TextEncoder().encode(
      process.env.NODE_ENV === "production"
        ? BUILD_FALLBACK
        : "eduhub-dev-secret-change-in-production"
    );
  }

  if (secret.length < 32) {
    if (process.env.NODE_ENV === "production" && !isNextBuildPhase()) {
      throw new Error("AUTH_SECRET must be at least 32 characters");
    }
    return new TextEncoder().encode(BUILD_FALLBACK);
  }

  return new TextEncoder().encode(secret);
}
