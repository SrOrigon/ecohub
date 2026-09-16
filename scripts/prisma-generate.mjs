import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectPostgresUrl, applyDurableDatabaseUrl } from "./lib/database-mode.mjs";
import { syncPrismaSchema } from "./sync-prisma-schema.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

if (!process.env.DATABASE_URL && !collectPostgresUrl()) {
  process.env.DATABASE_URL = "file:./.prisma-build.db";
} else {
  applyDurableDatabaseUrl();
}

const schema = syncPrismaSchema();
execSync(`npx prisma@5.22.0 generate --schema="${schema}"`, { stdio: "inherit", cwd: ROOT });
