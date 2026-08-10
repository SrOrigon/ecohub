#!/usr/bin/env node
/**
 * Backup do banco SQLite EduHub.
 * Uso: node scripts/backup-db.mjs [caminho-db] [pasta-destino]
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const dbPath = process.argv[2] ?? process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./prisma/dev.db";
const destDir = process.argv[3] ?? "./backups";
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dest = join(destDir, `eduhub-${stamp}.db`);

if (!existsSync(dbPath)) {
  console.error(`[backup] Arquivo não encontrado: ${dbPath}`);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(dbPath, dest);
console.log(`[backup] OK → ${dest}`);
