import { execSync, spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureAuthSecretInDatabase } from "./ensure-auth-secret-store.mjs";
import { ensureProductionPersistence, ensureDatabaseUrl } from "./ensure-production-persistence.mjs";
import { restoreDatabaseIfNeeded } from "./restore-db-from-backup.mjs";
import { updateGoldenBackup } from "./golden-backup.mjs";
import { countUsersInDatabase } from "./lib/db-user-count.mjs";
import { isPostgresUrl } from "./lib/database-mode.mjs";
import { ensurePostgresSchema } from "./ensure-postgres-schema.mjs";
import { syncPrismaSchema } from "./sync-prisma-schema.mjs";
import {
  isInstitutionalMode,
  databasePathFromUrl,
  DATA_DIR,
  PERSISTENCE_MANIFEST,
  getPersistentVolumeStatus,
} from "./lib/paths.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEXT_BIN = join(ROOT, "node_modules/next/dist/bin/next");

if (process.env.NODE_ENV === "production") {
  process.env.ECOHUB_INSTITUTIONAL = process.env.ECOHUB_INSTITUTIONAL || "1";
}

const institutionalMode = isInstitutionalMode();

function run(cmd, { optional = false, timeout = 180_000 } = {}) {
  try {
    execSync(cmd, { stdio: "inherit", cwd: ROOT, timeout });
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (optional) {
      console.warn(`[ecohub] Comando falhou (${cmd}):`, msg);
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

/** Confirma que o diretório do banco existe e aceita escrita. */
function ensureDataDirectory(dbPath) {
  const dir = dbPath ? dirname(dbPath) : DATA_DIR;
  try {
    mkdirSync(dir, { recursive: true });
    const probe = join(dir, ".ecohub-write-probe");
    writeFileSync(probe, "ok", "utf8");
    unlinkSync(probe);
    return true;
  } catch (error) {
    console.error(
      `[ecohub] CRÍTICO: ${dir} não aceita escrita:`,
      error instanceof Error ? error.message : error
    );
    console.error("[ecohub] Monte um volume persistente em", DATA_DIR, "no painel do Railway.");
    return false;
  }
}

async function bootstrapPostgres() {
  const before = await countUsersInDatabase(process.env.DATABASE_URL);
  if (before > 0) {
    console.log(`[ecohub] PostgreSQL já tem ${before} usuário(s) — schema será só atualizado, sem apagar contas.`);
  }

  const schema = syncPrismaSchema();
  const migrated = run(`npx prisma migrate deploy --schema="${schema}"`, { optional: true });
  if (!migrated) {
    console.warn("[ecohub] migrate deploy falhou — tentando db push (somente se banco vazio).");
    if (before === 0) {
      run(`npx prisma db push --skip-generate --schema="${schema}"`, { optional: true });
    } else {
      console.error(
        "[ecohub] migrate deploy falhou com contas existentes — NÃO será feito db push para proteger dados."
      );
    }
  }

  try {
    await ensurePostgresSchema(process.env.DATABASE_URL);
  } catch (error) {
    console.warn(
      "[ecohub] Patch de schema Postgres ignorado:",
      error instanceof Error ? error.message : error
    );
  }

  try {
    const { restoreInstitutionalSnapshotIfDegraded } = await import("./institutional-snapshot.mjs");
    const restore = await restoreInstitutionalSnapshotIfDegraded();
    if (restore.restored) {
      console.log(
        `[ecohub] Snapshot institucional restaurou contas: ${restore.usersBefore} → ${restore.usersAfter}`
      );
    }
  } catch (error) {
    console.warn(
      "[ecohub] Restauração via snapshot ignorada:",
      error instanceof Error ? error.message : error
    );
  }

  const users = await countUsersInDatabase(process.env.DATABASE_URL);
  if (users < 0) {
    console.error("[ecohub] CRÍTICO: PostgreSQL inacessível após bootstrap.");
  } else {
    console.log(`[ecohub] PostgreSQL pronto: ${users} usuário(s)`);
  }
  if (before > 0 && users === 0) {
    console.error(
      `[ecohub] CRÍTICO: havia ${before} usuário(s) e o Postgres ficou vazio após o schema. Contas não deveriam ser apagadas.`
    );
  }
  return { writable: true, users, postgres: true };
}

/**
 * Prepara o banco ANTES de servir tráfego: restaura backup, aplica migrations
 * e valida a conexão. Servir com banco quebrado derruba login e cadastros.
 */
async function bootstrapDatabase(dbPath, previousUsers) {
  if (isPostgresUrl(process.env.DATABASE_URL)) {
    return bootstrapPostgres();
  }

  const writable = ensureDataDirectory(dbPath);

  try {
    const restore = await restoreDatabaseIfNeeded(dbPath, {
      minUsers: previousUsers > 0 ? 1 : 0,
    });
    if (restore.restored) {
      console.log(`[ecohub] Recuperação: ${restore.userCount} usuário(s) (${restore.source}).`);
    }
  } catch (error) {
    console.warn(
      "[ecohub] Restauração inicial falhou (segue para migrations):",
      error instanceof Error ? error.message : error
    );
  }

  const migrated = run("npx prisma migrate deploy", { optional: true });
  if (!migrated) {
    const usersNow = await countUsersInDatabase(`file:${dbPath}`);
    if (usersNow > 0) {
      console.error(
        `[ecohub] migrate deploy falhou com ${usersNow} usuário(s) no banco — NÃO será feito db push para não arriscar dados.`
      );
    } else {
      console.warn("[ecohub] migrate deploy falhou em banco vazio — sincronizando schema via db push.");
      run("npx prisma db push --skip-generate", { optional: true });
    }
  }

  try {
    const afterMigrate = await restoreDatabaseIfNeeded(dbPath, { minUsers: 1 });
    if (afterMigrate.restored) {
      console.log(`[ecohub] Recuperação pós-migração: ${afterMigrate.userCount} usuário(s).`);
    }
  } catch {
    /* já logado acima */
  }

  const users = await countUsersInDatabase(`file:${dbPath}`);
  if (users < 0) {
    console.error("[ecohub] CRÍTICO: banco inacessível após bootstrap:", dbPath);
    console.error("[ecohub] Login e cadastros vão falhar até o volume ser corrigido.");
  } else {
    console.log(`[ecohub] Banco pronto: ${users} usuário(s) em ${dbPath}`);
  }

  if (previousUsers > 0 && users === 0) {
    console.error(
      `[ecohub] ALERTA: havia ${previousUsers} usuário(s) e o banco está vazio. Verifique ${DATA_DIR}/backups.`
    );
  }

  return { writable, users };
}

/** Backups e manifesto — pesado demais para bloquear o start. */
async function backgroundMaintenance(dbPath, previousUsers) {
  try {
    const persistence = await ensureProductionPersistence({
      runBackup: true,
      minUsersForBackup: previousUsers,
      skipPrune: true,
    });

    if (dbPath && !isPostgresUrl(process.env.DATABASE_URL) && (persistence.userCount ?? 0) > 0) {
      await updateGoldenBackup(dbPath);
    }

    if (
      (institutionalMode || process.env.NODE_ENV === "production") &&
      !isPostgresUrl(process.env.DATABASE_URL) &&
      !persistence.volumeWritable
    ) {
      console.error(
        `[ecohub:bg] ERRO CRÍTICO: monte um volume em ${DATA_DIR} no Railway antes de usar em produção.`
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

/**
 * spawn (e não execSync): execSync bloqueia o event loop e impediria
 * qualquer tarefa assíncrona de backup rodar enquanto o servidor está no ar.
 */
function startNext(port) {
  const child = spawn(
    process.execPath,
    [NEXT_BIN, "start", "-H", "0.0.0.0", "-p", String(port)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: "production",
        DATABASE_URL: process.env.DATABASE_URL,
        ECOHUB_INSTITUTIONAL: process.env.ECOHUB_INSTITUTIONAL || "1",
        AUTH_SECRET: process.env.AUTH_SECRET,
        HOSTNAME: "0.0.0.0",
      },
    }
  );

  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.on(signal, () => {
      if (!child.killed) child.kill(signal);
    });
  }

  child.on("error", (error) => {
    console.error("[ecohub] Falha ao iniciar o Next.js:", error.message);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    process.exit(signal ? 1 : (code ?? 0));
  });

  return child;
}

async function main() {
  console.log(
    `[ecohub] Iniciando produção (modo: ${institutionalMode ? "institucional" : "produção"})...`
  );

  ensureDatabaseUrl();

  if (!existsSync(NEXT_BIN)) {
    console.error("[ecohub] Next.js não encontrado em", NEXT_BIN);
    process.exit(1);
  }

  const postgres = isPostgresUrl(process.env.DATABASE_URL);
  const dbPath = postgres ? null : databasePathFromUrl(process.env.DATABASE_URL);
  const previousUsers = readPreviousUserCount();

  console.log("[ecohub] DATABASE_URL:", postgres ? "postgresql://***" : process.env.DATABASE_URL);

  const volume = getPersistentVolumeStatus();
  if (postgres) {
    console.log("[ecohub] Persistência: PostgreSQL gerenciado (logins sobrevivem a deploys).");
  } else if (!volume.mounted) {
    console.error("[ecohub] CRÍTICO: sem PostgreSQL e sem volume persistente.");
    console.error("[ecohub]", volume.reason);
    console.error("[ecohub] Cadastros serão recusados até existir PostgreSQL ou Volume em /data.");
  } else {
    console.log(`[ecohub] Volume persistente OK (${volume.source}):`, volume.mountPath);
  }

  await bootstrapDatabase(dbPath, previousUsers);

  const authSecret = await ensureAuthSecretInDatabase();
  if (!authSecret || authSecret.length < 32) {
    console.error("[ecohub] ERRO CRÍTICO: não foi possível obter AUTH_SECRET válido.");
  } else {
    console.log("[ecohub] AUTH_SECRET OK (login e sessões habilitados).");
  }

  const port = process.env.PORT || "3000";
  console.log(`[ecohub] Subindo Next.js na porta ${port}...`);
  startNext(port);

  void backgroundMaintenance(dbPath, previousUsers);

  const HOUR_MS = 60 * 60 * 1000;
  setInterval(() => {
    void backgroundMaintenance(dbPath, Math.max(previousUsers, 1));
  }, HOUR_MS);
}

main().catch((error) => {
  console.error("[ecohub] Falha fatal no start:", error);
  process.exit(1);
});
