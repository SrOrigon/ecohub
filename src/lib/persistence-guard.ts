/**
 * Garante que contas (logins) sejam gravadas no volume persistente em produção.
 */
import { accessSync, constants, copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { isManagedPostgres, applyDurableDatabaseUrl, isPostgresUrl } from "@/lib/database-mode";
import {
  ACCOUNT_SNAPSHOT_PATH,
  DATABASE_COPY_PATH,
  GOLDEN_BACKUP_PATH,
  PRODUCTION_DATABASE_PATH,
} from "@/lib/production-database";

const DATA_DIR = process.env.ECOHUB_DATA_DIR?.trim() || "/data";

export function databasePathFromUrl(url = process.env.DATABASE_URL): string | null {
  if (!url?.trim()) return null;
  return url.trim().replace(/^file:/, "");
}

export function isOnPersistentVolume(dbPath: string | null): boolean {
  if (!dbPath) return false;
  const normalized = dbPath.replace(/\\/g, "/");
  return normalized === DATA_DIR || normalized.startsWith(`${DATA_DIR}/`);
}

export function getPersistentVolumeStatus(): {
  mounted: boolean;
  source: string;
  mountPath: string | null;
  reason: string | null;
} {
  const expected = DATA_DIR.replace(/\\/g, "/");
  const railwayMount = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim().replace(/\\/g, "/");
  const onRailway = !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID
  );

  let procMounted: boolean | null = null;
  try {
    const mounts = readFileSync("/proc/mounts", "utf8");
    procMounted = mounts.split("\n").some((line) => {
      const mountPoint = line.split(/\s+/)[1];
      return mountPoint === expected || mountPoint === `${expected}/`;
    });
  } catch {
    procMounted = null;
  }

  if (railwayMount === expected || railwayMount === `${expected}/`) {
    return { mounted: true, source: "railway-env", mountPath: railwayMount, reason: null };
  }

  if (procMounted) {
    return { mounted: true, source: "proc-mounts", mountPath: expected, reason: null };
  }

  if (railwayMount) {
    return {
      mounted: false,
      source: "railway-env",
      mountPath: railwayMount,
      reason: `Volume Railway montado em ${railwayMount}, mas o app exige ${expected}.`,
    };
  }

  if (onRailway || procMounted === false) {
    return {
      mounted: false,
      source: onRailway ? "railway-missing-volume" : "proc-mounts",
      mountPath: null,
      reason:
        "Nenhum volume persistente em /data. No Railway: serviço eduhub → Volumes → Add volume → Mount path /data. Depois redeploy e cadastre de novo.",
    };
  }

  return { mounted: true, source: "local", mountPath: expected, reason: null };
}

/** True quando logins sobrevivem a deploy: Postgres gerenciado ou volume /data. */
export function isDurablePersistenceReady(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (isManagedPostgres()) return true;
  return getPersistentVolumeStatus().mounted;
}

/** Exige banco durável em produção (PostgreSQL Railway ou Volume /data). */
export function assertProductionDatabasePersistent(): void {
  if (process.env.NODE_ENV !== "production") return;

  const url = applyDurableDatabaseUrl();
  if (isPostgresUrl(url)) return;

  const volume = getPersistentVolumeStatus();
  if (!volume.mounted) {
    console.error("[persistência] CRÍTICO:", volume.reason);
    throw new Error(
      "PERSISTENCE_UNAVAILABLE: adicione PostgreSQL no Railway (Database) ou monte o volume em /data"
    );
  }

  try {
    mkdirSync(DATA_DIR, { recursive: true });
    mkdirSync(dirname(GOLDEN_BACKUP_PATH), { recursive: true });
    accessSync(DATA_DIR, constants.W_OK);
  } catch (error) {
    console.error(
      "[persistência] CRÍTICO: volume /data não gravável:",
      error instanceof Error ? error.message : error
    );
    throw new Error("PERSISTENCE_UNAVAILABLE: adicione PostgreSQL no Railway ou monte o volume em /data");
  }

  if (!isOnPersistentVolume(PRODUCTION_DATABASE_PATH) && !isOnPersistentVolume(databasePathFromUrl(url))) {
    throw new Error("PERSISTENCE_UNAVAILABLE: banco SQLite deve estar em /data/prod.db");
  }
}

/** Copia prod.db para golden + cópia extra imediatamente após cadastro. */
export async function persistGoldenBackupNow(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;
  if (isManagedPostgres()) return;

  const { prisma } = await import("@/lib/db");

  try {
    await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(FULL)");
  } catch {
    /* continua */
  }

  if (!existsSync(PRODUCTION_DATABASE_PATH)) {
    console.warn("[persistência] prod.db não encontrado para backup dourado.");
    return;
  }

  mkdirSync(dirname(GOLDEN_BACKUP_PATH), { recursive: true });
  copyFileSync(PRODUCTION_DATABASE_PATH, GOLDEN_BACKUP_PATH);
  copyFileSync(PRODUCTION_DATABASE_PATH, DATABASE_COPY_PATH);
  for (const suffix of ["-wal", "-shm"] as const) {
    const source = `${PRODUCTION_DATABASE_PATH}${suffix}`;
    if (existsSync(/* turbopackIgnore: true */ source)) {
      copyFileSync(source, `${GOLDEN_BACKUP_PATH}${suffix}`);
      copyFileSync(source, `${DATABASE_COPY_PATH}${suffix}`);
    }
  }

  const userCount = await prisma.user.count();
  const updatedAt = new Date().toISOString();
  writeFileSync(
    ACCOUNT_SNAPSHOT_PATH,
    `${JSON.stringify({ userCount, updatedAt })}\n`,
    "utf8"
  );

  const manifestPath = process.env.ECOHUB_PERSISTENCE_MANIFEST?.trim() || `${DATA_DIR}/.ecohub-persistence.json`;
  try {
    const previous = existsSync(/* turbopackIgnore: true */ manifestPath)
      ? (JSON.parse(readFileSync(/* turbopackIgnore: true */ manifestPath, "utf8")) as Record<string, unknown>)
      : {};
    writeFileSync(
      manifestPath,
      `${JSON.stringify(
        {
          ...previous,
          updatedAt,
          userCount,
          peakUserCount: Math.max(Number(previous.peakUserCount ?? 0), userCount),
          lastBackup: GOLDEN_BACKUP_PATH,
          goldenBackup: GOLDEN_BACKUP_PATH,
          databasePath: PRODUCTION_DATABASE_PATH,
          databaseBytes: statSync(PRODUCTION_DATABASE_PATH).size,
          volumeWritable: true,
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  } catch {
    /* manifesto é auxiliar — o backup dourado já foi gravado */
  }

  console.log(`[persistência] Backup dourado salvo (${userCount} usuário(s)).`);
}

/** Confirma que o usuário foi gravado no banco após create. */
export async function confirmUserPersisted(
  findUser: (id: string) => Promise<{ id: string } | null>,
  userId: string
): Promise<void> {
  const saved = await findUser(userId);
  if (!saved) {
    console.error("[persistência] CRÍTICO: usuário criado mas não encontrado no banco:", userId);
    throw new Error("USER_NOT_PERSISTED");
  }

  try {
    await persistGoldenBackupNow();
  } catch (error) {
    // A conta já foi gravada; falha no backup não deve bloquear o cadastro.
    console.error("[persistência] Backup pós-cadastro falhou (conta gravada):", error);
  }

  try {
    const { saveInstitutionalSnapshot } = await import("@/lib/institutional-snapshot");
    await saveInstitutionalSnapshot("user-persisted");
  } catch (error) {
    console.error("[persistência] Snapshot institucional falhou (conta gravada):", error);
  }
}
