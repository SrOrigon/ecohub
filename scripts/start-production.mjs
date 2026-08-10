import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:/tmp/eduhub.db";
  console.warn("[eduhub] DATABASE_URL ausente — usando", process.env.DATABASE_URL);
}

function run(cmd, optional = false) {
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (optional) {
      console.warn(`[eduhub] Comando opcional falhou (${cmd}):`, msg);
      return false;
    }
    throw error;
  }
}

console.log("[eduhub] Iniciando produção...");

try {
  run("npx prisma migrate deploy", true);
} catch {
  /* já logado */
}

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.trim().length < 32) {
  console.warn("[eduhub] AVISO: AUTH_SECRET ausente ou curto — configure no Railway (≥32 chars).");
} else {
  console.log("[eduhub] AUTH_SECRET OK.");
}

const prisma = new PrismaClient();
try {
  const users = await prisma.user.count();
  if (users === 0) {
    console.log("[eduhub] Banco vazio — seed completo...");
    run("npx tsx prisma/seed.ts", true);
  } else {
    console.log("[eduhub] Verificando contas demo...");
    run("npx tsx prisma/ensure-demo.ts", true);
  }
} catch (error) {
  console.warn("[eduhub] Setup demo falhou:", error instanceof Error ? error.message : error);
} finally {
  await prisma.$disconnect();
}

const port = process.env.PORT || "3000";
console.log(`[eduhub] Subindo Next.js na porta ${port}...`);
execSync(`npx next start -p ${port}`, { stdio: "inherit" });
