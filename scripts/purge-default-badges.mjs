import { applyDurableDatabaseUrl } from "./lib/database-mode.mjs";
import { PrismaClient } from "@prisma/client";

const dbUrl = applyDurableDatabaseUrl();
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

const DEFAULT_MOCK_BADGE_NAMES = [
  "Pontualidade",
  "Estudante Estrela",
  "Missão Completa",
  "Nota 10",
  "Assiduidade de Ouro",
  "Mestre das Missões",
  "Estudante Exemplar",
  "Pontualidade exemplar",
];

async function main() {
  const schoolIdArg = process.argv[2] || process.env.SCHOOL_ID;
  const purgeAll = process.argv.includes("--all");

  console.log("[purge-default-badges] Iniciando expurgo de atitudes/badges padrão...");

  const whereCondition = {
    ...(schoolIdArg ? { schoolId: schoolIdArg } : {}),
    ...(!purgeAll ? { name: { in: DEFAULT_MOCK_BADGE_NAMES } } : {}),
  };

  const deleted = await prisma.badge.deleteMany({
    where: whereCondition,
  });

  console.log(`[purge-default-badges] Concluído: ${deleted.count} registro(s) de atitudes removido(s).`);
}

main()
  .catch((err) => {
    console.error("[purge-default-badges] Erro:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
