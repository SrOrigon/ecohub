#!/usr/bin/env node
/**
 * Impede comandos destrutivos do Prisma quando o banco está em produção ou no volume /data.
 */
import { databasePathFromUrl, isPersistentDatabasePath } from "./lib/paths.mjs";

const dbPath = databasePathFromUrl();
const onPersistentVolume = isPersistentDatabasePath(dbPath);
const isProduction = process.env.NODE_ENV === "production";

if (isProduction || onPersistentVolume) {
  console.error("");
  console.error("[ecohub] BLOQUEADO: este comando apaga TODOS os dados do banco.");
  console.error("[ecohub] Contas, senhas e registros das escolas seriam perdidos permanentemente.");
  if (dbPath) console.error("[ecohub] Banco detectado em:", dbPath);
  console.error("[ecohub] Use apenas em desenvolvimento local (DATABASE_URL fora de /data).");
  console.error("");
  process.exit(1);
}
