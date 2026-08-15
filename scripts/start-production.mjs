import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { ensureAuthSecret } from "./ensure-auth-secret.mjs";
import { ensureProductionPersistence, ensureDatabaseUrl } from "./ensure-production-persistence.mjs";
import { restoreDatabaseIfNeeded } from "./restore-db-from-backup.mjs";
import { updateGoldenBackup } from "./golden-backup.mjs";
import {
  isInstitutionalMode,
  databasePathFromUrl,
  PERSISTENCE_MANIFEST,
} from "./lib/paths.mjs";

if (process.env.NODE_ENV === "production") {
  process.env.ECOHUB_INSTITUTIONAL = process.env.ECOHUB_INSTITUTIONAL || "1";
}

const institutionalMode = isInstitutionalMode();

function run(cmd, optional = false) {
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (optional) {
      console.warn(`[ecohub] Comando opcional falhou (${cmd}):`, msg);
      return false;
    }
    throw error;
  }
}

function readPreviousUserCount() {
  if (!existsSync(PERSISTENCE_MANIFEST)) return 0;
  try {
    const manifest = JSON.parse(readFileSync(PERSISTENCE_MANIFEST, "utf8"));
    return manifest.userCount ?? 0;
  } catch {
    return 0;
  }
}

console.log(
  `[ecohub] Iniciando produção (modo: ${institutionalMode ? "institucional" : "produção"})...`
);

ensureDatabaseUrl();
const dbPath = databasePathFromUrl(process.env.DATABASE_URL);
const previousUsers = readPreviousUserCount();

await ensureProductionPersistence();

const restore = await restoreDatabaseIfNeeded(dbPath, {
  minUsers: previousUsers > 0 ? 1 : 1,
});
if (restore.restored) {
  console.log(`[ecohub] Recuperação automática: ${restore.userCount} usuário(s) (${restore.source}).`);
}

try {
  run("npx prisma migrate deploy", true);
} catch {
  /* já logado */
}

const restoreAfterMigrate = await restoreDatabaseIfNeeded(dbPath, { minUsers: 1 });
if (restoreAfterMigrate.restored) {
  console.log(`[ecohub] Recuperação pós-migração: ${restoreAfterMigrate.userCount} usuário(s).`);
}

const persistence = await ensureProductionPersistence({
  runBackup: true,
  minUsersForBackup: previousUsers,
});

if (persistence.userCount === 0) {
  const retryRestore = await restoreDatabaseIfNeeded(dbPath, { minUsers: 1 });
  if (retryRestore.restored) {
    console.log(`[ecohub] Recuperação final: ${retryRestore.userCount} usuário(s).`);
    if (dbPath) await updateGoldenBackup(dbPath);
  } else if (previousUsers > 0) {
    console.error(
      `[ecohub] ERRO CRÍTICO: havia ${previousUsers} usuário(s) e o banco está vazio. Verifique o volume /data.`
    );
  }
} else if (dbPath) {
  await updateGoldenBackup(dbPath);
}

if ((institutionalMode || process.env.NODE_ENV === "production") && !persistence.volumeWritable) {
  console.error(
    "[ecohub] ERRO CRÍTICO: monte um volume em /data no Railway antes de usar em produção."
  );
}

const authSecret = ensureAuthSecret();
const authOk = authSecret.length >= 32;

if (!authOk) {
  console.error("[ecohub] ERRO CRÍTICO: não foi possível obter AUTH_SECRET válido.");
} else {
  console.log("[ecohub] AUTH_SECRET OK (login e sessões habilitados).");
}

const prisma = new PrismaClient();
try {
  const users = await prisma.user.count();

  if (users === 0) {
    console.log("[ecohub] Banco vazio  -  cadastre a escola em /registro/escola");
  } else {
    console.log(`[ecohub] ${users} usuário(s) no banco — logins protegidos.`);
  }
} catch (error) {
  console.warn("[ecohub] Verificação do banco falhou:", error instanceof Error ? error.message : error);
} finally {
  await prisma.$disconnect();
}

const port = process.env.PORT || "3000";
console.log(`[ecohub] Subindo Next.js na porta ${port}...`);
console.log("[ecohub] DATABASE_URL:", process.env.DATABASE_URL);

execSync(`npx next start -p ${port}`, {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: process.env.DATABASE_URL,
    ECOHUB_INSTITUTIONAL: process.env.ECOHUB_INSTITUTIONAL || "1",
  },
});
