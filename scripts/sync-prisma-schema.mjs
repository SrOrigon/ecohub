import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectPostgresUrl, isPostgresUrl } from "./lib/database-mode.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SOURCE_SCHEMA = join(ROOT, "prisma", "schema.prisma");
export const DEPLOY_SCHEMA = join(ROOT, "prisma", "schema.deploy.prisma");

export function shouldUsePostgresProvider() {
  return isPostgresUrl(collectPostgresUrl()) || isPostgresUrl(process.env.DATABASE_URL);
}

/** Gera schema.deploy.prisma com o provider certo (sqlite local / postgres produção). */
export function syncPrismaSchema() {
  const source = readFileSync(SOURCE_SCHEMA, "utf8");
  const provider = shouldUsePostgresProvider() ? "postgresql" : "sqlite";
  const schema = source.replace(/provider\s*=\s*"sqlite"/, `provider = "${provider}"`);
  writeFileSync(DEPLOY_SCHEMA, schema, "utf8");
  console.log(`[ecohub] Prisma provider: ${provider} → prisma/schema.deploy.prisma`);
  return DEPLOY_SCHEMA;
}
