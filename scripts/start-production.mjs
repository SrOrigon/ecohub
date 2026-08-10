import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/** Mesmo valor de DEMO_AUTH_SECRET em src/lib/auth-secret.ts */
const DEMO_AUTH_SECRET = "eduhub-railway-demo-auth-secret-v1-min-32-chars";

const demoMode =
  process.env.EDUHUB_ENABLE_DEMO === "1" || process.env.EDUHUB_ENABLE_DEMO === "true";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = demoMode ? "file:/tmp/eduhub.db" : "file:/data/prod.db";
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

console.log(`[eduhub] Iniciando produção (modo: ${demoMode ? "demo" : "institucional"})...`);

try {
  run("npx prisma migrate deploy", true);
} catch {
  /* já logado */
}

const authOk = process.env.AUTH_SECRET?.trim() && process.env.AUTH_SECRET.trim().length >= 32;

if (!authOk) {
  if (demoMode) {
    process.env.AUTH_SECRET = DEMO_AUTH_SECRET;
    console.warn(
      "[eduhub] Modo demo: AUTH_SECRET ausente — usando segredo demo embutido. Defina AUTH_SECRET para produção real."
    );
  } else {
    console.error(
      "[eduhub] AUTH_SECRET obrigatório em produção institucional (mínimo 32 caracteres).\n" +
        "       Gere um segredo forte e configure nas variáveis de ambiente.\n" +
        "       Para ambiente demo público, use EDUHUB_ENABLE_DEMO=1."
    );
    process.exit(1);
  }
} else {
  console.log("[eduhub] AUTH_SECRET OK.");
}

if (!demoMode && process.env.DATABASE_URL.includes("/tmp/")) {
  console.warn(
    "[eduhub] DATABASE_URL aponta para /tmp — dados podem ser perdidos no redeploy. Use volume em /data/prod.db."
  );
}

const prisma = new PrismaClient();
try {
  const users = await prisma.user.count();

  if (demoMode) {
    if (users === 0) {
      console.log("[eduhub] Modo demo — banco vazio, seed completo...");
      run("npx tsx prisma/seed.ts", true);
    } else {
      console.log("[eduhub] Modo demo — verificando contas demo...");
      run("npx tsx prisma/ensure-demo.ts", true);
    }
  } else if (users === 0) {
    console.log(
      "[eduhub] Modo institucional — banco vazio. Cadastre a primeira escola em /registro/escola"
    );
  } else {
    console.log(`[eduhub] Modo institucional — ${users} usuário(s) no banco.`);
  }
} catch (error) {
  console.warn("[eduhub] Verificação do banco falhou:", error instanceof Error ? error.message : error);
} finally {
  await prisma.$disconnect();
}

const port = process.env.PORT || "3000";
console.log(`[eduhub] Subindo Next.js na porta ${port}...`);
execSync(`npx next start -p ${port}`, { stdio: "inherit" });
