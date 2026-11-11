import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { prisma } from "@/lib/db";
import { isUsableAuthSecret, ensureAuthSecretAtRuntime } from "@/lib/auth-secret-runtime";
import { getPersistentVolumeStatus, isDurablePersistenceReady } from "@/lib/persistence-guard";
import { ensureDatabaseUrlAtRuntime } from "@/lib/database-url-runtime";
import { isManagedPostgres, isPostgresUrl, isSqliteFileUrl } from "@/lib/database-mode";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Testa escrita real no volume — manifesto ausente não prova nada. */
function probeVolumeWritable(databasePath: string): boolean | null {
  if (!databasePath) return null;
  const dir = dirname(databasePath);
  try {
    mkdirSync(/* turbopackIgnore: true */ dir, { recursive: true });
    const probe = `${dir}/.ecohub-health-probe`;
    writeFileSync(/* turbopackIgnore: true */ probe, "ok", "utf8");
    unlinkSync(/* turbopackIgnore: true */ probe);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const started = Date.now();
  const productionDeploy = process.env.NODE_ENV === "production";
  let dbOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  if (productionDeploy) {
    ensureDatabaseUrlAtRuntime();
    if (!isUsableAuthSecret(process.env.AUTH_SECRET)) {
      try {
        ensureAuthSecretAtRuntime();
      } catch {
        /* health check continua */
      }
    }
  }

  const authConfigured = isUsableAuthSecret(process.env.AUTH_SECRET);
  const institutional =
    process.env.ECOHUB_INSTITUTIONAL === "1" ||
    process.env.ECOHUB_INSTITUTIONAL === "true";

  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const postgres = isManagedPostgres() || isPostgresUrl(databaseUrl);
  const databasePath = postgres ? null : databaseUrl.replace(/^file:/, "");
  const onPersistentVolume = postgres
    ? true
    : Boolean(databasePath && (databasePath.startsWith("/data/") || databasePath === "/data"));

  const volumeStatus = getPersistentVolumeStatus();
  const volumeWritable = postgres
    ? true
    : productionDeploy && databasePath && isSqliteFileUrl(`file:${databasePath}`)
      ? probeVolumeWritable(databasePath)
      : productionDeploy
        ? probeVolumeWritable(databasePath || "/data")
        : null;
  const volumeMounted = postgres || !productionDeploy || volumeStatus.mounted;
  const durable = postgres || isDurablePersistenceReady();

  const persistenceOk = !productionDeploy || durable;
  const status = dbOk && persistenceOk ? "ok" : "degraded";
  const httpStatus = dbOk && persistenceOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      service: "ecohub",
      version: process.env.npm_package_version ?? "0.1.0",
      uptime: process.uptime(),
      checks: {
        database: dbOk ? "ok" : "error",
        authSecret: authConfigured ? "ok" : "missing",
        persistence: persistenceOk ? "ok" : "warning",
      },
      persistence: productionDeploy
        ? {
            engine: postgres ? "postgresql" : "sqlite",
            onPersistentVolume,
            volumeMounted,
            volumeWritable,
            persisted: durable && dbOk,
          }
        : undefined,
      mode: institutional ? "institutional" : "production",
      responseMs: Date.now() - started,
    },
    { status: httpStatus }
  );
}
