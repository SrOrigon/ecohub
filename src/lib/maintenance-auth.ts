const BUILD_FALLBACK = "ecohub-build-placeholder-secret-do-not-use-at-runtime-32";

/** Segredos aceitos para endpoints operacionais (/api/admin/*). */
export function getMaintenanceSecrets(): string[] {
  const secrets = new Set<string>();
  const maintenance = process.env.MAINTENANCE_SECRET?.trim();
  const auth = process.env.AUTH_SECRET?.trim();

  if (maintenance && maintenance.length >= 32) secrets.add(maintenance);
  if (auth && auth.length >= 32) secrets.add(auth);

  // Mesmo fallback usado por getAuthSecret() quando AUTH_SECRET não está configurado.
  if (!auth || auth.length < 32) secrets.add(BUILD_FALLBACK);

  return [...secrets];
}

export function authorizeMaintenanceRequest(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token.length < 32) return false;
  return getMaintenanceSecrets().includes(token);
}
