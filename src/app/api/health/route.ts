import { existsSync, readFileSync } from "node:fs";
import { prisma } from "@/lib/db";
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
  let dbOk = false;
  let userCount: number | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    userCount = await prisma.user.count();
  } catch {
    dbOk = false;
  }

  const authConfigured =
    !!process.env.AUTH_SECRET?.trim() && process.env.AUTH_SECRET.trim().length >= 32;
  const institutional =
    process.env.ECOHUB_INSTITUTIONAL === "1" ||
    process.env.ECOHUB_INSTITUTIONAL === "true";

  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const databasePath = databaseUrl.replace(/^file:/, "");
  const onPersistentVolume =
    databasePath.startsWith("/data/") || databasePath === "/data";

  const manifest = readPersistenceManifest();

  const persistenceOk =
    !institutional || (onPersistentVolume && (manifest?.volumeWritable ?? true));

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
      persistence: institutional
        ? {
            databasePath: databasePath || null,
            onPersistentVolume,
            userCount: userCount ?? manifest?.userCount ?? null,
            lastBackup: manifest?.lastBackup ?? null,
            volumeWritable: manifest?.volumeWritable ?? null,
          }
        : undefined,
      mode: institutional ? "institutional" : "production",
      responseMs: Date.now() - started,
    },
    { status: httpStatus }
  );
}
