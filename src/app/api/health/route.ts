import { existsSync, readFileSync } from "node:fs";
import { prisma } from "@/lib/db";
import { isUsableAuthSecret, ensureAuthSecretAtRuntime } from "@/lib/auth-secret-runtime";
import { ensureDatabaseUrlAtRuntime } from "@/lib/database-url-runtime";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PersistenceManifest = {
  volumeWritable?: boolean;
  userCount?: number | null;
  lastBackup?: string | null;
  databasePath?: string | null;
};

function readPersistenceManifest(): PersistenceManifest | null {
  const manifestPath = process.env.ECOHUB_PERSISTENCE_MANIFEST?.trim() || "/data/.ecohub-persistence.json";
  if (!existsSync(/* turbopackIgnore: true */ manifestPath)) return null;
  try {
    return JSON.parse(
      readFileSync(/* turbopackIgnore: true */ manifestPath, "utf8")
    ) as PersistenceManifest;
  } catch {
    return null;
  }
}

export async function GET() {
  const started = Date.now();
  const productionDeploy = process.env.NODE_ENV === "production";
  let dbOk = false;
  let userCount: number | null = null;
  let schoolCount: number | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    [userCount, schoolCount] = await Promise.all([prisma.user.count(), prisma.school.count()]);
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
  const databasePath = databaseUrl.replace(/^file:/, "");
  const onPersistentVolume =
    databasePath.startsWith("/data/") || databasePath === "/data";

  const manifest = readPersistenceManifest();

  const persistenceOk =
    !productionDeploy || (onPersistentVolume && (manifest?.volumeWritable ?? true));

  const status = dbOk && persistenceOk ? "ok" : "degraded";
  const httpStatus = dbOk ? 200 : 503;

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
            databasePath: databasePath || null,
            onPersistentVolume,
            volumeWritable: manifest?.volumeWritable ?? null,
            accounts: {
              users: userCount ?? manifest?.userCount ?? null,
              schools: schoolCount,
              persisted: onPersistentVolume && (manifest?.volumeWritable ?? true),
            },
            lastBackup: manifest?.lastBackup ?? null,
          }
        : undefined,
      mode: institutional ? "institutional" : "production",
      responseMs: Date.now() - started,
    },
    { status: httpStatus }
  );
}
