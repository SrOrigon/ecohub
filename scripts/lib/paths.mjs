/** Utilitários de caminho para scripts de produção (Node ESM). */
import { readFileSync } from "node:fs";

export const DATA_DIR = process.env.ECOHUB_DATA_DIR?.trim() || "/data";
export const DEFAULT_DB_URL = `file:${DATA_DIR}/prod.db`;
export const DEFAULT_BACKUP_DIR = `${DATA_DIR}/backups`;
export const AUTH_SECRET_FILE =
  process.env.ECOHUB_AUTH_SECRET_FILE?.trim() || `${DATA_DIR}/.auth_secret`;
export const PERSISTENCE_MANIFEST = `${DATA_DIR}/.ecohub-persistence.json`;

export function isInstitutionalMode() {
  return (
    process.env.ECOHUB_INSTITUTIONAL === "1" ||
    process.env.ECOHUB_INSTITUTIONAL === "true"
  );
}

export function isProductionDeploy() {
  return process.env.NODE_ENV === "production";
}

export function shouldEnforcePersistentDatabase() {
  return isInstitutionalMode() || isProductionDeploy();
}

export function databasePathFromUrl(url = process.env.DATABASE_URL) {
  if (!url?.trim()) return null;
  return url.trim().replace(/^file:/, "");
}

export function isPersistentDatabasePath(dbPath) {
  if (!dbPath) return false;
  const normalized = dbPath.replace(/\\/g, "/");
  return normalized === DATA_DIR || normalized.startsWith(`${DATA_DIR}/`);
}

/**
 * Prova que /data é um volume montado, não o disco efêmero do container.
 * No Railway, volume anexado injeta RAILWAY_VOLUME_MOUNT_PATH.
 */
export function getPersistentVolumeStatus() {
  const expected = DATA_DIR.replace(/\\/g, "/");
  const railwayMount = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim().replace(/\\/g, "/");
  const onRailway = !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID
  );

  let procMounted = null;
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

export function isPersistentVolumeMounted() {
  return getPersistentVolumeStatus().mounted;
}
