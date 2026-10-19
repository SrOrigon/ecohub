/**
 * Garante escola e exercícios de demonstração no banco (idempotente).
 * Usado no boot de produção para /login/demo funcionar sem passo manual.
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEMO_SLUG = "colegio-modelo-ecohub";

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findUnique({ where: { slug: DEMO_SLUG } });
  let exerciseCount = 0;
  if (school) {
    exerciseCount = await prisma.exercise.count({
      where: { schoolId: school.id, title: { startsWith: "Demo:" } },
    });
  }

  if (school && exerciseCount >= 2) {
    console.log("[ecohub] Ambiente demo já presente — nada a fazer.");
    return;
  }

  console.log("[ecohub] Preparando ambiente demo para /login/demo...");
  execSync("npx tsx scripts/seed-commercial-demo.ts", {
    cwd: ROOT,
    stdio: "inherit",
    timeout: 900_000,
  });
}

main()
  .catch((error) => {
    console.warn(
      "[ecohub] Falha ao preparar demo (login demo pode falhar):",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 0;
  })
  .finally(() => prisma.$disconnect());
