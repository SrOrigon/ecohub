import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

run("npx prisma migrate deploy");

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.trim().length < 32) {
  console.error("[eduhub] AUTH_SECRET ausente ou curto demais (mínimo 32 caracteres).");
  console.error("[eduhub] Configure em Railway → Variables antes de usar login e sessões.");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const users = await prisma.user.count();
  if (users === 0) {
    console.log("[eduhub] Banco vazio — populando contas demo...");
    run("npx tsx prisma/seed.ts");
    console.log("[eduhub] Seed concluído.");
  }
} finally {
  await prisma.$disconnect();
}

run("npx next start");
