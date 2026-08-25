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

      if (process.env.ECOHUB_DEMO_STUDENT !== "0") {
        try {
          const { ensureDemoStudent, logDemoCredentials } = await import("@/lib/demo-student");
          const result = await ensureDemoStudent();
          if (result.ok) logDemoCredentials(result);
        } catch (error) {
          console.warn(
            "[ecohub] Conta demo no startup ignorada:",
            error instanceof Error ? error.message : error
          );
        }
      }
    }
  }
}
