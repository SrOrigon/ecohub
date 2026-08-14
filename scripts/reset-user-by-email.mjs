#!/usr/bin/env node
/**
 * Remove usuário (e instituição vinculada, se diretor) para permitir novo cadastro.
 * Uso: node scripts/reset-user-by-email.mjs <email> [caminho-db]
 *
 * Produção (Railway): railway run node scripts/reset-user-by-email.mjs email@exemplo.com
 */
import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const email = process.argv[2]?.trim().toLowerCase();
const dbArg = process.argv[3];

if (!email || !email.includes("@")) {
  console.error("Uso: node scripts/reset-user-by-email.mjs <email> [caminho-db]");
  process.exit(1);
}

function resolveDbPath() {
  if (dbArg) return resolve(dbArg);
  const fromEnv = process.env.DATABASE_URL?.replace(/^file:/, "");
  if (fromEnv && existsSync(fromEnv)) return resolve(fromEnv);
  for (const candidate of ["./dev.db", "./prisma/dev.db"]) {
    if (existsSync(candidate)) return resolve(candidate);
  }
  return resolve("./dev.db");
}

const dbPath = resolveDbPath();
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient();

async function resetUser(targetEmail) {
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      schoolId: true,
      school: { select: { id: true, name: true, slug: true, cnpj: true } },
    },
  });

  if (!user) {
    console.log(`[reset] Nenhum usuário com e-mail ${targetEmail} em ${dbPath}`);
    return { found: false };
  }

  console.log(`[reset] Encontrado: ${user.fullName} (${user.role}) — ${user.email}`);
  if (user.school) {
    console.log(`[reset] Instituição: ${user.school.name} (${user.school.slug}) CNPJ=${user.school.cnpj ?? "—"}`);
  }

  const isInstitutionOwner =
    user.schoolId && (user.role === "director" || user.role === "admin");

  if (isInstitutionOwner) {
    const deletedUsers = await prisma.user.deleteMany({ where: { schoolId: user.schoolId } });
    await prisma.school.delete({ where: { id: user.schoolId } });
    console.log(`[reset] Instituição removida; ${deletedUsers.count} usuário(s) apagado(s).`);
    return { found: true, removedSchool: true, removedUsers: deletedUsers.count };
  }

  await prisma.user.delete({ where: { id: user.id } });
  console.log("[reset] Usuário removido.");
  return { found: true, removedSchool: false, removedUsers: 1 };
}

try {
  console.log(`[reset] Banco: ${dbPath}`);
  const result = await resetUser(email);
  if (result.found) {
    console.log(`[reset] OK — ${email} liberado para novo cadastro.`);
  }
} catch (error) {
  console.error("[reset] ERRO:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
