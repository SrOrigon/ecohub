import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import type { UserRole } from "@/lib/constants";

export const STAFF_ROLES: UserRole[] = ["admin", "director", "secretary", "teacher"];
export const MANAGEMENT_ROLES: UserRole[] = ["admin", "director", "secretary"];
export const LEADERSHIP_ROLES: UserRole[] = ["admin", "director"];

/** Painel inicial de cada papel, usado como destino seguro em redirecionamentos. */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "student":
      return "/dashboard/aluno";
    case "parent":
      return "/dashboard/responsavel";
    case "teacher":
      return "/dashboard/professor";
    case "secretary":
      return "/dashboard/secretaria";
    default:
      return "/dashboard";
  }
}

export type SchoolSessionUser = SessionUser & { schoolId: string };

/**
 * Garante sessão válida e papel permitido antes de renderizar a página.
 * Redireciona para o painel do próprio papel em vez de expor dados de outro perfil.
 */
export async function requirePageAccess(allowedRoles: UserRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!allowedRoles.includes(user.role)) redirect(homePathForRole(user.role));
  return user;
}

/** Igual a requirePageAccess, mas também exige que o usuário pertença a uma escola. */
export async function requireSchoolPageAccess(
  allowedRoles: UserRole[]
): Promise<SchoolSessionUser> {
  const user = await requirePageAccess(allowedRoles);
  if (!user.schoolId) redirect(homePathForRole(user.role));
  return user as SchoolSessionUser;
}
