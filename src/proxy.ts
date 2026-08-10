import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, TENANT_COOKIE } from "@/lib/auth";
import { resolveTenantSlug, TENANT_HEADER } from "@/lib/tenant";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "eduhub-dev-secret-change-in-production"
);

const publicPaths = ["/", "/login", "/registro", "/entrar", "/convite"];

function isPublicPath(pathname: string) {
  if (publicPaths.includes(pathname)) return true;
  if (pathname.startsWith("/login/")) return true;
  if (pathname.startsWith("/registro/")) return true;
  if (pathname.startsWith("/convite/")) return true;
  if (pathname.startsWith("/e/")) return true;
  if (pathname.startsWith("/entrar")) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "localhost";
  const tenantSlug = resolveTenantSlug(hostname, pathname);

  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) {
    requestHeaders.set(TENANT_HEADER, tenantSlug);
  }

  if (
    isPublicPath(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (tenantSlug) {
      response.cookies.set(TENANT_COOKIE, tenantSlug, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const loginUrl = tenantSlug ? `/e/${tenantSlug}/login` : "/login";
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const jwtSchoolId = (payload.schoolId as string | null) ?? null;

    if (tenantSlug) {
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      response.cookies.set(TENANT_COOKIE, tenantSlug, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
      return response;
    }

    if (jwtSchoolId) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
