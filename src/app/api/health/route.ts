import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { prisma } from "@/lib/db";
import { isUsableAuthSecret, ensureAuthSecretAtRuntime } from "@/lib/auth-secret-runtime";
import { getPersistentVolumeStatus } from "@/lib/persistence-guard";
import { ensureDatabaseUrlAtRuntime } from "@/lib/database-url-runtime";
import { NextResponse } from "next/server";

const GOLDEN_BACKUP_PATH = "/data/backups/ecohub-golden.db";

export const dynamic = "force-dynamic";

type PersistenceManifest = {
  volumeWritable?: boolean;
  userCount?: number | null;
  lastBackup?: string | null;
  databasePath?: string | null;
};

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
  const volumeStatus = getPersistentVolumeStatus();
  const volumeWritable = productionDeploy ? probeVolumeWritable(databasePath) : null;
  const volumeMounted = !productionDeploy || volumeStatus.mounted;

  const goldenExists = existsSync(/* turbopackIgnore: true */ GOLDEN_BACKUP_PATH);
  let lastBackup = manifest?.lastBackup ?? null;
  if (!lastBackup && goldenExists) {
    try {
      lastBackup = statSync(/* turbopackIgnore: true */ GOLDEN_BACKUP_PATH).mtime.toISOString();
    } catch {
      lastBackup = GOLDEN_BACKUP_PATH;
    }
  }

  const persistenceOk =
    !productionDeploy || (onPersistentVolume && volumeWritable === true && volumeMounted);

  const status = dbOk && persistenceOk ? "ok" : "degraded";
  const httpStatus = dbOk && volumeMounted ? 200 : 503;

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
            volumeMounted,
            volumeMountPath: volumeStatus.mountPath,
            volumeSource: volumeStatus.source,
            volumeReason: volumeStatus.reason,
            volumeWritable,
            accounts: {
              users: userCount ?? manifest?.userCount ?? null,
              schools: schoolCount,
              persisted: onPersistentVolume && volumeWritable === true && volumeMounted,
              goldenBackup: goldenExists,
            },
            lastBackup,
          }
        : undefined,
      mode: institutional ? "institutional" : "production",
      responseMs: Date.now() - started,
    },
    { status: httpStatus }
  );
}
