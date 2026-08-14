import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { ensureAuthSecret } from "./ensure-auth-secret.mjs";
import { ensureProductionPersistence } from "./ensure-production-persistence.mjs";
import { isInstitutionalMode } from "./lib/paths.mjs";

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

const persistence = await ensureProductionPersistence();
if (institutionalMode && !persistence.volumeWritable) {
  console.error(
    "[ecohub] ERRO CRÍTICO: monte um volume em /data no Railway antes de usar em produção."
  );
}

try {
  run("npx prisma migrate deploy", true);
} catch {
  /* já logado */
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
execSync(`npx next start -p ${port}`, { stdio: "inherit" });
