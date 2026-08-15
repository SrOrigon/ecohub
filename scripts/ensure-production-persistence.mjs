import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { PrismaClient } from "@prisma/client";
import { backupDatabase } from "./backup-db.mjs";
import {
  DATA_DIR,
  DEFAULT_DB_URL,
  isPersistentDatabasePath,
  PERSISTENCE_MANIFEST,
  databasePathFromUrl,
  shouldEnforcePersistentDatabase,
} from "./lib/paths.mjs";

function log(level, message) {
  console.log(`[ecohub:persistência] ${level}: ${message}`);
}

export function ensureDatabaseUrl() {
  const current = process.env.DATABASE_URL?.trim();
  const dbPath = databasePathFromUrl(current);

  if (!current) {
    process.env.DATABASE_URL = DEFAULT_DB_URL;
    log("info", `DATABASE_URL ausente — usando ${DEFAULT_DB_URL}`);
  } else if (shouldEnforcePersistentDatabase() && !isPersistentDatabasePath(dbPath)) {
    log(
      "aviso",
      `DATABASE_URL (${current}) não está no volume ${DATA_DIR}. Redirecionando para ${DEFAULT_DB_URL} para não perder dados no redeploy.`
    );
    process.env.DATABASE_URL = DEFAULT_DB_URL;
  }

  try {
    const urlFile = `${DATA_DIR}/.database_url`;
    mkdirSync(dirname(urlFile), { recursive: true });
    writeFileSync(urlFile, `${process.env.DATABASE_URL}\n`, "utf8");
  } catch {
    /* opcional */
  }

  return process.env.DATABASE_URL;
}

function ensureDataDirWritable() {
  if (!shouldEnforcePersistentDatabase()) return true;

  try {
    mkdirSync(DATA_DIR, { recursive: true });
    accessSync(DATA_DIR, constants.W_OK);
    return true;
  } catch (error) {
    log(
      "erro",
      `Volume ${DATA_DIR} não está gravável: ${error instanceof Error ? error.message : error}`
    );
    log(
      "erro",
      "Sem volume persistente, logins e dados das escolas podem ser perdidos a cada deploy."
    );
    return false;
  }
}

async function optimizeSqlite(prisma) {
  try {
    await prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL");
    await prisma.$executeRawUnsafe("PRAGMA synchronous=NORMAL");
    await prisma.$executeRawUnsafe("PRAGMA foreign_keys=ON");
  } catch (error) {
    log(
      "aviso",
      `PRAGMA SQLite ignorado: ${error instanceof Error ? error.message : error}`
    );
  }
}

function readManifest() {
  if (!existsSync(PERSISTENCE_MANIFEST)) return null;
  try {
    return JSON.parse(readFileSync(PERSISTENCE_MANIFEST, "utf8"));
  } catch {
    return null;
  }
}

function writeManifest(data) {
  if (!shouldEnforcePersistentDatabase()) return;
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(PERSISTENCE_MANIFEST, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  } catch (error) {
    log(
      "aviso",
      `Não foi possível gravar manifesto: ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * Valida volume e registra estado de persistência.
 * @param {{ runBackup?: boolean }} [options]
 */
export async function ensureProductionPersistence(options = {}) {
  const runBackup = options.runBackup ?? false;
  const databaseUrl = ensureDatabaseUrl();
  const dbPath = databasePathFromUrl(databaseUrl);
  const volumeWritable = ensureDataDirWritable();
  const previous = readManifest();

  let lastBackup = null;
  if (runBackup && dbPath && existsSync(dbPath)) {
    try {
      const result = await backupDatabase({ dbPath, label: "pós-migração" });
      if (result.ok) lastBackup = result.path;
    } catch (error) {
      log(
        "aviso",
        `Backup automático falhou (deploy continua): ${error instanceof Error ? error.message : error}`
      );
    }
  }

  let userCount = null;
  const prisma = new PrismaClient();
  try {
    await optimizeSqlite(prisma);
    userCount = await prisma.user.count();
  } catch (error) {
    log(
      "aviso",
      `Contagem de usuários falhou: ${error instanceof Error ? error.message : error}`
    );
  } finally {
    await prisma.$disconnect();
  }

  const manifest = {
    updatedAt: new Date().toISOString(),
    databaseUrl,
    databasePath: dbPath,
    databaseBytes: dbPath && existsSync(dbPath) ? statSync(dbPath).size : 0,
    volumeWritable,
    userCount,
    lastBackup,
    previousUserCount: previous?.userCount ?? null,
    authSecretFile: process.env.ECOHUB_AUTH_SECRET_FILE?.trim() || `${DATA_DIR}/.auth_secret`,
  };

  writeManifest(manifest);

  if (userCount !== null && previous?.userCount != null && userCount < previous.userCount) {
    log(
      "aviso",
      `Usuários no banco diminuíram (${previous.userCount} → ${userCount}). Verifique backups em ${DATA_DIR}/backups.`
    );
  }

  if (volumeWritable && isPersistentDatabasePath(dbPath)) {
    log("info", `Dados persistentes em ${dbPath} (${userCount ?? "?"} usuário(s)).`);
    if (lastBackup) log("info", `Backup automático: ${lastBackup}`);
  }

  return { volumeWritable, userCount, lastBackup };
}
