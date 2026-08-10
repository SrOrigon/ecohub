import type { UserRole } from "@/lib/constants";
import type { LoginPortal } from "@/lib/preference-cookies";
import { tenantLoginPath } from "@/lib/tenant";

const ROLE_PORTAL: Record<UserRole, LoginPortal> = {
  admin: "escola",
  director: "escola",
  secretary: "escola",
  teacher: "professor",
  student: "aluno",
  parent: "responsavel",
};

export function portalLoginPath(portal: LoginPortal, tenantSlug?: string | null): string {
  if (tenantSlug) return `/e/${tenantSlug}/login/${portal}`;
  return `/login/${portal}`;
}

export function loginHubPath(tenantSlug?: string | null): string {
  if (tenantSlug) return tenantLoginPath(tenantSlug);
  return "/login";
}

export function loginPathForRole(role: UserRole, tenantSlug?: string | null): string {
  if (tenantSlug) return tenantLoginPath(tenantSlug);
  const portal = ROLE_PORTAL[role];
  return portal === "escola" ? "/login/escola" : `/login/${portal}`;
}

export function registerPathForPortal(portal: LoginPortal, tenantSlug?: string | null): string {
  const base =
    portal === "escola"
      ? "/registro/escola"
      : portal === "professor"
        ? "/registro/professor"
        : portal === "aluno"
          ? "/registro/aluno"
          : "/registro/responsavel";
  if (tenantSlug && portal !== "escola" && portal !== "professor") {
    return `${base}?escola=${encodeURIComponent(tenantSlug)}`;
  }
  return base;
}
