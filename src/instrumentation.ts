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

export async function onRequestError(
  error: { digest?: string } & Error,
  request: {
    path: string;
    method: string;
    headers: Record<string, string>;
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "action" | "middleware";
  }
) {
  console.error("[telemetry-exception]", {
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    errorMessage: error.message,
    errorDigest: error.digest,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
}
