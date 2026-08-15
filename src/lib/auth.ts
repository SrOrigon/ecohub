import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { UserRole } from "@/lib/constants";
import { findSchoolBySlug } from "@/lib/school-lookup";
import { getAuthSecret } from "@/lib/auth-secret";
import { TENANT_COOKIE } from "@/lib/tenant";

const SESSION_COOKIE = "ecohub_session";

function authSecret() {
  return getAuthSecret();
}

export interface SessionPayload {
  userId: string;
  schoolId: string | null;
  role: string;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  schoolId: string | null;
  avatarUrl: string | null;
}

export async function createSessionToken(
  userId: string,
  schoolId: string | null,
  role: string,
  remember = false
) {
  const duration = remember ? "30d" : "7d";
  return new SignJWT({ userId, schoolId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(duration)
    .setIssuedAt()
    .sign(authSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret());
    return {
      userId: payload.userId as string,
      schoolId: (payload.schoolId as string | null) ?? null,
      role: (payload.role as string) ?? "student",
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string, remember = false) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
  });
}

export async function setTenantCookie(slug: string) {
  const cookieStore = await cookies();
  cookieStore.set(TENANT_COOKIE, slug.toLowerCase(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function clearTenantCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TENANT_COOKIE);
}

async function validateTenantForUser(user: SessionUser): Promise<boolean> {
  const cookieStore = await cookies();
  const tenantSlug = cookieStore.get(TENANT_COOKIE)?.value;
  if (!tenantSlug) return true;
  if (!user.schoolId) return true;

  const school = await findSchoolBySlug(tenantSlug);
  if (!school) return false;

  return school.id === user.schoolId;
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, fullName: true, role: true, schoolId: true, avatarUrl: true },
  });
  if (!user) return null;

  const sessionUser: SessionUser = { ...user, role: user.role as SessionUser["role"] };

  if (payload.schoolId && user.schoolId && payload.schoolId !== user.schoolId) {
    return null;
  }

  if (payload.role && payload.role !== user.role) {
    return null;
  }

  const tenantOk = await validateTenantForUser(sessionUser);
  if (!tenantOk) return null;

  return sessionUser;
});

function homePathForRole(role: UserRole) {
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

export async function requireSession(allowedRoles?: UserRole[]) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect(homePathForRole(user.role));
  }
  return user;
}

export type SessionResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string };

export async function requireSessionResult(allowedRoles?: UserRole[]): Promise<SessionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { ok: false, error: "Sem permissão para esta ação." };
  }
  return { ok: true, user };
}

export async function establishSession(
  user: { id: string; schoolId: string | null; role: string },
  options?: { remember?: boolean; tenantSlug?: string | null }
) {
  const token = await createSessionToken(user.id, user.schoolId, user.role, options?.remember);
  await setSessionCookie(token, options?.remember);
  const slug = options?.tenantSlug?.trim().toLowerCase();
  if (slug) {
    await setTenantCookie(slug);
  } else if (user.schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { slug: true },
    });
    if (school) await setTenantCookie(school.slug);
  }
}

/** Igual a establishSession, mas não derruba a requisição se a sessão falhar. */
export async function safeEstablishSession(
  user: { id: string; schoolId: string | null; role: string },
  options?: { remember?: boolean; tenantSlug?: string | null }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await establishSession(user, options);
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Falha ao criar sessão.";
    console.error("[auth] safeEstablishSession:", reason);
    return { ok: false, reason };
  }
}

export { SESSION_COOKIE, TENANT_COOKIE };
