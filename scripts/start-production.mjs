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
  if (process.env.NODE_ENV === "production" && !demoMode) {
    console.warn(
      "[eduhub] AVISO: AUTH_SECRET não configurado ou menor que 32 caracteres.\n" +
        "        Para garantir persistência segura de logins entre restarts, defina AUTH_SECRET no seu ambiente."
    );
    process.env.AUTH_SECRET = DEMO_AUTH_SECRET;
  } else {
    process.env.AUTH_SECRET = DEMO_AUTH_SECRET;
  }
} else {
  console.log("[eduhub] AUTH_SECRET OK.");
}

if (!demoMode && process.env.DATABASE_URL.includes("/tmp/")) {
  console.warn(
    "[eduhub] ATENÇÃO: DATABASE_URL está apontando para /tmp — dados podem ser perdidos em restarts. Recomendado montar volume em /data/prod.db."
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
