#!/usr/bin/env node
/** Wrapper Node para scripts/demo-student.ts (bootstrap em .mjs). */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2).join(" ");

export async function ensureDemoStudent() {
  execSync(`npx tsx scripts/demo-student.ts ${args}`.trim(), {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  return { ok: true };
}

export async function removeDemoStudent(databaseUrl) {
  const env = { ...process.env };
  if (databaseUrl) env.DATABASE_URL = databaseUrl;
  execSync("npx tsx scripts/demo-student.ts --remove", {
    cwd: ROOT,
    stdio: "inherit",
    env,
  });
  return { ok: true };
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").includes("demo-student.mjs");
if (isDirectRun) {
  const remove = process.argv.includes("--remove");
  if (remove) {
    removeDemoStudent().catch((e) => {
      console.error(e);
      process.exit(1);
    });
  } else {
    ensureDemoStudent().catch((e) => {
      console.error(e);
      process.exit(1);
    });
  }
}
