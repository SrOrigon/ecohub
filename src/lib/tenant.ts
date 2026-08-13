export const TENANT_COOKIE = "ecohub_tenant";
export const TENANT_HEADER = "x-ecohub-tenant";

export function getRootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "ecohub.app";
}

/** Extrai slug do tenant a partir do host (subdomínio) ou path /e/[slug]. */
export function resolveTenantSlug(hostname: string, pathname: string): string | null {
  const host = hostname.split(":")[0].toLowerCase();
  const root = getRootDomain().toLowerCase();

  if (host.endsWith(`.${root}`) && host !== root && host !== `www.${root}`) {
    const sub = host.slice(0, -(root.length + 1));
    if (sub && sub !== "www") return sub;
  }

  if (host === "localhost" || host.endsWith(".localhost")) {
    const parts = host.split(".");
    if (parts.length > 1 && parts[0] !== "localhost") return parts[0];
  }

  const pathMatch = pathname.match(/^\/e\/([a-z0-9-]+)(\/|$)/);
  if (pathMatch) return pathMatch[1];

  return null;
}

export function tenantLoginPath(slug: string): string {
  return `/e/${slug}/login`;
}

export function tenantEntrarPath(slug: string): string {
  return `/e/${slug}/entrar`;
}

export function tenantPublicUrl(slug: string): string {
  const root = getRootDomain();
  if (process.env.NODE_ENV === "development") {
    return `http://localhost:3000/e/${slug}`;
  }
  return `https://${slug}.${root}`;
}
