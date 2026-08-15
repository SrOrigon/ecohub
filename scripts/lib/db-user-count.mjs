import { PrismaClient } from "@prisma/client";

/**
 * Conta usuários em um banco SQLite via Prisma (URL explícita).
 */
export async function countUsersInDatabase(databaseUrl) {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    return await prisma.user.count();
  } catch {
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}
