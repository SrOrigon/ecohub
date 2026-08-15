/** Utilitários de caminho para scripts de produção (Node ESM). */

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
