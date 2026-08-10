import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

run("npx prisma migrate deploy");

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.trim().length < 32) {
  console.warn("[eduhub] AVISO: AUTH_SECRET ausente ou curto — login pode falhar.");
  console.warn("[eduhub] Configure em Railway → Variables (mínimo 32 caracteres).");
} else {
  console.log("[eduhub] AUTH_SECRET configurado.");
}

const prisma = new PrismaClient();
try {
  const users = await prisma.user.count();
  if (users === 0) {
    console.log("[eduhub] Banco vazio — populando contas demo (seed completo)...");
    run("npx tsx prisma/seed.ts");
    console.log("[eduhub] Seed concluído.");
  } else {
    console.log("[eduhub] Verificando contas demo...");
    try {
      run("npx tsx prisma/ensure-demo.ts");
    } catch (e) {
      console.warn("[eduhub] ensure-demo falhou (app sobe mesmo assim):", e?.message ?? e);
    }
  }
} finally {
  await prisma.$disconnect();
}

run("npx next start");
