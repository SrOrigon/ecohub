import type { SessionUser } from "@/lib/auth";
import type { UserRole } from "@/lib/constants";

export class AccessDeniedError extends Error {
  constructor() {
    super("FORBIDDEN");
  }
}

export function assertSameSchool(user: SessionUser, schoolId: string | null | undefined): void {
  if (!schoolId || !user.schoolId || user.schoolId !== schoolId) {
    throw new AccessDeniedError();
  }
}

export function assertRole(user: SessionUser, roles: UserRole[]): void {
  if (!roles.includes(user.role)) {
    throw new AccessDeniedError();
  }
}

export function assertSelf(user: SessionUser, targetUserId: string): void {
  if (user.id !== targetUserId) {
    throw new AccessDeniedError();
  }
}

/** Próprio usuário ou staff da mesma escola. */
export function assertSelfOrSchoolStaff(
  user: SessionUser,
  targetUserId: string,
  staffRoles: UserRole[] = ["admin", "director", "teacher"]
): void {
  if (user.id === targetUserId) return;
  if (staffRoles.includes(user.role) && user.schoolId) return;
  throw new AccessDeniedError();
}

/** Responsável acessando apenas seus próprios dados. */
export function assertParentSelf(user: SessionUser, parentId: string): void {
  if (user.role !== "parent" || user.id !== parentId) {
    throw new AccessDeniedError();
  }
}
