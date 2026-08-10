import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { UserRole } from "@/lib/constants";

const SESSION_COOKIE = "eduhub_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "eduhub-dev-secret-change-in-production"
);

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  schoolId: string | null;
  avatarUrl: string | null;
}

export async function createSessionToken(userId: string, remember = false) {
  const duration = remember ? "30d" : "7d";
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(duration)
    .setIssuedAt()
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload.userId as string;
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

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const userId = await verifySessionToken(token);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true, schoolId: true, avatarUrl: true },
    });
    if (!user) return null;
    return { ...user, role: user.role as SessionUser["role"] };
  } catch {
    return null;
  }
}

export async function requireSession(allowedRoles?: UserRole[]) {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (allowedRoles && !allowedRoles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export type SessionResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string };

/** Use in server actions with useActionState — returns error instead of throwing. */
export async function requireSessionResult(allowedRoles?: UserRole[]): Promise<SessionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { ok: false, error: "Sem permissão para esta ação." };
  }
  return { ok: true, user };
}

export { SESSION_COOKIE };
