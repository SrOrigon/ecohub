import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const institutionalMode =
  process.env.ECOHUB_INSTITUTIONAL === "1" || process.env.ECOHUB_INSTITUTIONAL === "true";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:/data/prod.db";
  console.warn("[ecohub] DATABASE_URL ausente  -  usando", process.env.DATABASE_URL);
}

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

try {
  run("npx prisma migrate deploy", true);
} catch {
  /* já logado */
}

const authOk = process.env.AUTH_SECRET?.trim() && process.env.AUTH_SECRET.trim().length >= 32;

if (!authOk) {
  console.warn(
    "[ecohub] AVISO: AUTH_SECRET não configurado ou menor que 32 caracteres.\n" +
      "        Defina AUTH_SECRET nas variáveis de ambiente antes do go-live."
  );
} else {
  console.log("[ecohub] AUTH_SECRET OK.");
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
