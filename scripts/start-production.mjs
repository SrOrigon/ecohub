import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { ensureAuthSecret } from "./ensure-auth-secret.mjs";
import { ensureProductionPersistence, ensureDatabaseUrl } from "./ensure-production-persistence.mjs";
import { restoreDatabaseIfNeeded } from "./restore-db-from-backup.mjs";
import { updateGoldenBackup } from "./golden-backup.mjs";
import {
  isInstitutionalMode,
  databasePathFromUrl,
  PERSISTENCE_MANIFEST,
} from "./lib/paths.mjs";

if (process.env.NODE_ENV === "production") {
  process.env.ECOHUB_INSTITUTIONAL = process.env.ECOHUB_INSTITUTIONAL || "1";
}

const institutionalMode = isInstitutionalMode();

function run(cmd, optional = false) {
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (optional) {
      console.warn(`[ecohub] Comando opcional falhou (${cmd}):`, msg);
      return false;
    }
    throw error;
  }
}

function readPreviousUserCount() {
  if (!existsSync(PERSISTENCE_MANIFEST)) return 0;
  try {
    const manifest = JSON.parse(readFileSync(PERSISTENCE_MANIFEST, "utf8"));
    return Math.max(manifest.peakUserCount ?? 0, manifest.userCount ?? 0, manifest.previousUserCount ?? 0);
  } catch {
    return 0;
  }
}

async function runDeferredPersistence(dbPath, previousUsers) {
  try {
    const restoreAfterMigrate = await restoreDatabaseIfNeeded(dbPath, { minUsers: 1 });
    if (restoreAfterMigrate.restored) {
      console.log(`[ecohub:bg] Recuperação pós-migração: ${restoreAfterMigrate.userCount} usuário(s).`);
    }

    const persistence = await ensureProductionPersistence({
      runBackup: true,
      minUsersForBackup: previousUsers,
      skipPrune: true,
    });

    if (persistence.userCount === 0 && previousUsers > 0) {
      const retryRestore = await restoreDatabaseIfNeeded(dbPath, { minUsers: 1 });
      if (retryRestore.restored) {
        console.log(`[ecohub:bg] Recuperação final: ${retryRestore.userCount} usuário(s).`);
        if (dbPath) await updateGoldenBackup(dbPath);
      } else {
        console.error(
          `[ecohub:bg] ERRO CRÍTICO: havia ${previousUsers} usuário(s) e o banco está vazio. Verifique o volume /data.`
        );
      }
    } else if (dbPath && (persistence.userCount ?? 0) > 0) {
      await updateGoldenBackup(dbPath);
    }

    if ((institutionalMode || process.env.NODE_ENV === "production") && !persistence.volumeWritable) {
      console.error(
        "[ecohub:bg] ERRO CRÍTICO: monte um volume em /data no Railway antes de usar em produção."
      );
    }

    console.log("[ecohub:bg] Persistência em background concluída.");
  } catch (error) {
    console.warn(
      "[ecohub:bg] Persistência em background falhou (app continua rodando):",
      error instanceof Error ? error.message : error
    );
  }
}

console.log(
  `[ecohub] Iniciando produção (modo: ${institutionalMode ? "institucional" : "produção"})...`
);

ensureDatabaseUrl();
const dbPath = databasePathFromUrl(process.env.DATABASE_URL);
const previousUsers = readPreviousUserCount();
const minUsersToRestore = previousUsers > 0 ? 1 : 0;

const restore = await restoreDatabaseIfNeeded(dbPath, { minUsers: minUsersToRestore });
if (restore.restored) {
  console.log(`[ecohub] Recuperação automática: ${restore.userCount} usuário(s) (${restore.source}).`);
}

run("npx prisma migrate deploy", true);

const authSecret = ensureAuthSecret();
if (authSecret.length < 32) {
  console.error("[ecohub] ERRO CRÍTICO: não foi possível obter AUTH_SECRET válido.");
} else {
  console.log("[ecohub] AUTH_SECRET OK (login e sessões habilitados).");
}

await ensureProductionPersistence({ runBackup: false });

const port = process.env.PORT || "3000";
console.log(`[ecohub] Subindo Next.js na porta ${port} (backups em background)...`);
console.log("[ecohub] DATABASE_URL:", process.env.DATABASE_URL);

void runDeferredPersistence(dbPath, previousUsers);

const child = spawn("npx", ["next", "start", "-p", port], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: process.env.DATABASE_URL,
    ECOHUB_INSTITUTIONAL: process.env.ECOHUB_INSTITUTIONAL || "1",
  },
});

child.on("error", (error) => {
  console.error("[ecohub] Falha ao iniciar Next.js:", error instanceof Error ? error.message : error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[ecohub] Next.js encerrado por sinal: ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});
