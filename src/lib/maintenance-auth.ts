import { timingSafeEqual } from "crypto";
import { ensureAuthSecretAtRuntime, isUsableAuthSecret } from "@/lib/auth-secret-runtime";

/**
 * Segredos aceitos para endpoints operacionais (/api/admin/*).
 */
export function getMaintenanceSecrets(): string[] {
  if (process.env.NODE_ENV === "production" && !isUsableAuthSecret(process.env.AUTH_SECRET)) {
    ensureAuthSecretAtRuntime();
  }

  const secrets = new Set<string>();
  const maintenance = process.env.MAINTENANCE_SECRET?.trim();
  const auth = process.env.AUTH_SECRET?.trim();

  if (maintenance && maintenance.length >= 32) secrets.add(maintenance);
  if (auth && auth.length >= 32) secrets.add(auth);

  return [...secrets];
}

function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function authorizeMaintenanceRequest(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token.length < 32) return false;

  const secrets = getMaintenanceSecrets();
  if (secrets.length === 0) return false;

  return secrets.some((secret) => safeEquals(token, secret));
}
