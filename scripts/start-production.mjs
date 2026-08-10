import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/** Mesmo valor de DEMO_AUTH_SECRET em src/lib/auth-secret.ts */
const DEMO_AUTH_SECRET = "eduhub-railway-demo-auth-secret-v1-min-32-chars";

const institutionalMode =
  process.env.EDUHUB_INSTITUTIONAL === "1" || process.env.EDUHUB_INSTITUTIONAL === "true";

let demoMode =
  process.env.EDUHUB_ENABLE_DEMO === "1" || process.env.EDUHUB_ENABLE_DEMO === "true";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = demoMode || !institutionalMode ? "file:/tmp/eduhub.db" : "file:/data/prod.db";
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

console.log(
  `[eduhub] Iniciando produção (modo: ${institutionalMode ? "institucional" : demoMode ? "demo" : "padrão/demo-compat"})...`
);

try {
  run("npx prisma migrate deploy", true);
} catch {
  /* já logado */
}

let authOk = process.env.AUTH_SECRET?.trim() && process.env.AUTH_SECRET.trim().length >= 32;

if (!authOk) {
  if (institutionalMode) {
    console.error(
      "[eduhub] Modo institucional exige AUTH_SECRET (≥32 chars).\n" +
        "       Gere: openssl rand -base64 32"
    );
    process.exit(1);
  }
  process.env.AUTH_SECRET = DEMO_AUTH_SECRET;
  demoMode = true;
  console.warn(
    "[eduhub] AUTH_SECRET ausente — modo demo/compat ativado. Para escola real: EDUHUB_INSTITUTIONAL=1 + AUTH_SECRET."
  );
} else {
  console.log("[eduhub] AUTH_SECRET OK.");
}

if (institutionalMode && demoMode) {
  console.warn("[eduhub] EDUHUB_INSTITUTIONAL e EDUHUB_ENABLE_DEMO juntos — prioridade institucional (sem seed demo).");
  demoMode = false;
}

if (!demoMode && !institutionalMode && process.env.DATABASE_URL.includes("/tmp/")) {
  console.warn(
    "[eduhub] DATABASE_URL em /tmp — dados podem ser perdidos. Use volume /data/prod.db em produção."
  );
}

const prisma = new PrismaClient();
try {
  const users = await prisma.user.count();

  if (demoMode && !institutionalMode) {
    if (users === 0) {
      console.log("[eduhub] Modo demo — banco vazio, seed completo...");
      run("npx tsx prisma/seed.ts", true);
    } else {
      console.log("[eduhub] Modo demo — verificando contas demo...");
      run("npx tsx prisma/ensure-demo.ts", true);
    }
  } else if (users === 0) {
    console.log(
      "[eduhub] Modo institucional — banco vazio. Cadastre a escola em /registro/escola"
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
