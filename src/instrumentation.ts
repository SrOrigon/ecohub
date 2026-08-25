export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureAuthSecretAtRuntime } = await import("@/lib/auth-secret-runtime");
    const { ensureDatabaseUrlAtRuntime } = await import("@/lib/database-url-runtime");
    ensureDatabaseUrlAtRuntime();
    ensureAuthSecretAtRuntime();

    if (process.env.NODE_ENV === "production") {
      try {
        const { ensurePostgresSchema } = await import("../scripts/ensure-postgres-schema.mjs");
        await ensurePostgresSchema(process.env.DATABASE_URL);
      } catch (error) {
        console.warn(
          "[ecohub] Patch de schema Postgres no startup ignorado:",
          error instanceof Error ? error.message : error
        );
      }
    }
  }
}
