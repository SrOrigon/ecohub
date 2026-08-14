#!/usr/bin/env node
/**
 * Normaliza arquivos de texto: UTF-8 sem BOM, LF, sem espaços finais.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SKIP = new Set(["node_modules", ".next", ".git", "backups", "prisma/dev.db"]);
const EXT = /\.(ts|tsx|js|jsx|mjs|cjs|css|md|json|prisma|yml|yaml|example)$/;

let changed = 0;

function normalizeContent(text) {
  let out = text.replace(/^\uFEFF/, "");
  out = out.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  out = out
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");
  if (!out.endsWith("\n")) out += "\n";
  return out;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (entry.name === ".env" || EXT.test(entry.name)) {
      const raw = fs.readFileSync(full);
      const text = raw.toString("utf8");
      const normalized = normalizeContent(text);
      if (normalized !== text || raw[0] === 0xef) {
        fs.writeFileSync(full, normalized, "utf8");
        changed += 1;
        console.log("normalized:", path.relative(ROOT, full));
      }
    }
  }
}

walk(ROOT);
console.log(`\n[normalize] ${changed} arquivo(s) corrigido(s).`);
