export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureAuthSecretAtRuntime } = await import("@/lib/auth-secret-runtime");
    const { ensureDatabaseUrlAtRuntime } = await import("@/lib/database-url-runtime");
    ensureDatabaseUrlAtRuntime();
    ensureAuthSecretAtRuntime();
  }
}
