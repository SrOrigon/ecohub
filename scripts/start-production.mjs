import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { ensureAuthSecret } from "./ensure-auth-secret.mjs";
import { ensureProductionPersistence } from "./ensure-production-persistence.mjs";
import { restoreDatabaseIfEmpty } from "./restore-db-from-backup.mjs";
import { isInstitutionalMode, databasePathFromUrl } from "./lib/paths.mjs";

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

console.log(
  `[ecohub] Iniciando produção (modo: ${institutionalMode ? "institucional" : "produção"})...`
);

if (process.env.NODE_ENV === "production" && !institutionalMode) {
  console.warn(
    "[ecohub] AVISO: defina ECOHUB_INSTITUTIONAL=1 no Railway para modo institucional completo."
  );
}

await ensureProductionPersistence();

const restore = await restoreDatabaseIfEmpty(databasePathFromUrl(process.env.DATABASE_URL));
if (restore.restored) {
  console.log(`[ecohub] Recuperação automática: ${restore.userCount} usuário(s) restaurado(s).`);
}

try {
  run("npx prisma migrate deploy", true);
} catch {
  /* já logado */
}

const persistence = await ensureProductionPersistence({ runBackup: true });

if (persistence.userCount === 0) {
  const retryRestore = await restoreDatabaseIfEmpty(databasePathFromUrl(process.env.DATABASE_URL));
  if (retryRestore.restored) {
    console.log(`[ecohub] Recuperação pós-backup: ${retryRestore.userCount} usuário(s).`);
  }
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
    console.log(`[ecohub] ${users} usuário(s) no banco.`);
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
  env: { ...process.env },
});
