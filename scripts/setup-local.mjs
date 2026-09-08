import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLE = join(ROOT, ".env.local.example");
const TARGET = join(ROOT, ".env.local");

function randomSecret() {
  return randomBytes(48).toString("base64url");
}

function ensureEnvLocal() {
  if (!existsSync(EXAMPLE)) {
    throw new Error("Falta .env.local.example");
  }

  if (!existsSync(TARGET)) {
    copyFileSync(EXAMPLE, TARGET);
    console.log("[setup:local] Criado .env.local a partir do exemplo (SQLite).");
  }

  const envRoot = join(ROOT, ".env");
  if (!existsSync(envRoot)) {
    copyFileSync(existsSync(TARGET) ? TARGET : EXAMPLE, envRoot);
    console.log("[setup:local] Criado .env para o Prisma CLI (SQLite, gitignored).");
  }

  let text = readFileSync(TARGET, "utf8");
  if (/postgresql?:\/\//i.test(text) && !text.includes("file:./dev.db")) {
    console.warn(
      "[setup:local] AVISO: .env.local parece apontar para Postgres. Use SQLite local para não gastar o Hobby da Railway."
    );
  }

  if (/AUTH_SECRET="troque-por-um-segredo/.test(text) || /AUTH_SECRET=""/.test(text)) {
    text = text.replace(
      /AUTH_SECRET="[^"]*"/,
      `AUTH_SECRET="${randomSecret()}"`
    );
    writeFileSync(TARGET, text, "utf8");
    console.log("[setup:local] AUTH_SECRET gerado.");
  }
}

function migrate() {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    cwd: ROOT,
    env: {
      ...process.env,
      DATABASE_URL: "file:./dev.db",
    },
  });
}

ensureEnvLocal();
migrate();
console.log("[setup:local] Pronto. Rode: npm run dev  →  http://localhost:3000");
console.log("[setup:local] Opcional: npm run db:pilot  (escola de teste, só local).");
