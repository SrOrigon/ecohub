import { PrismaClient } from "@prisma/client";
import { ensureAuthSecret } from "./ensure-auth-secret.mjs";

const AUTH_META_KEY = "AUTH_SECRET";

/**
 * Persiste AUTH_SECRET no banco (AppMeta) para sessões sobreviverem
 * a deploys mesmo sem volume /data.
 */
export async function ensureAuthSecretInDatabase() {
  const secret = ensureAuthSecret();
  const prisma = new PrismaClient();
  try {
    const row = await prisma.appMeta.findUnique({ where: { key: AUTH_META_KEY } });
    if (row?.value && row.value.length >= 32) {
      process.env.AUTH_SECRET = row.value;
      console.log("[ecohub] AUTH_SECRET carregado da tabela AppMeta.");
      return row.value;
    }

    await prisma.appMeta.upsert({
      where: { key: AUTH_META_KEY },
      create: { key: AUTH_META_KEY, value: secret },
      update: { value: secret },
    });
    console.log("[ecohub] AUTH_SECRET gravado em AppMeta (sobrevive a deploys).");
    return secret;
  } catch (error) {
    console.warn(
      "[ecohub] AppMeta indisponível para AUTH_SECRET:",
      error instanceof Error ? error.message : error
    );
    return secret;
  } finally {
    await prisma.$disconnect();
  }
}
