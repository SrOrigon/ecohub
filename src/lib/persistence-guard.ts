/**
 * Garante que contas (logins) sejam gravadas no volume persistente em produção.
 */

const DATA_DIR = process.env.ECOHUB_DATA_DIR?.trim() || "/data";

export function databasePathFromUrl(url = process.env.DATABASE_URL): string | null {
  if (!url?.trim()) return null;
  return url.trim().replace(/^file:/, "");
}

export function isOnPersistentVolume(dbPath: string | null): boolean {
  if (!dbPath) return false;
  const normalized = dbPath.replace(/\\/g, "/");
  return normalized === DATA_DIR || normalized.startsWith(`${DATA_DIR}/`);
}

/** Bloqueia criação de conta se o banco não estiver no volume /data (produção). */
export function assertProductionDatabasePersistent(): void {
  if (process.env.NODE_ENV !== "production") return;

  const dbPath = databasePathFromUrl();
  if (!isOnPersistentVolume(dbPath)) {
    console.error(
      "[persistência] CRÍTICO: tentativa de salvar conta fora do volume /data.",
      "DATABASE_URL atual:",
      process.env.DATABASE_URL ?? "(ausente)"
    );
    throw new Error(
      "PERSISTENCE_UNAVAILABLE: contas só podem ser criadas com banco em /data/prod.db"
    );
  }
}

/** Confirma que o usuário foi gravado no banco após create. */
export async function confirmUserPersisted(
  findUser: (id: string) => Promise<{ id: string } | null>,
  userId: string
): Promise<void> {
  const saved = await findUser(userId);
  if (!saved) {
    console.error("[persistência] CRÍTICO: usuário criado mas não encontrado no banco:", userId);
    throw new Error("USER_NOT_PERSISTED");
  }

  scheduleGoldenBackup();
}

/** Atualiza backup dourado imediatamente após novo cadastro (produção). */
export function scheduleGoldenBackup(): void {
  if (process.env.NODE_ENV !== "production") return;

  const dbPath = databasePathFromUrl();
  if (!isOnPersistentVolume(dbPath)) return;

  import("node:child_process").then(({ exec }) => {
    exec("node scripts/golden-backup.mjs", { cwd: process.cwd() }, (error) => {
      if (error) {
        console.warn("[persistência] Backup dourado pós-cadastro falhou:", error.message);
      }
    });
  });
}
