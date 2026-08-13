import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth";
import { getAuthSecret } from "@/lib/auth-secret";
import { loginHubPath } from "@/lib/login-paths";
import { resolveTenantSlug, TENANT_HEADER } from "@/lib/tenant";

function authSecret() {
  return getAuthSecret();
}

const publicPaths = ["/", "/login", "/registro", "/entrar", "/convite"];

function isPublicPath(pathname: string) {
  if (publicPaths.includes(pathname)) return true;
  if (pathname.startsWith("/login/")) return true;
  if (pathname.startsWith("/registro/")) return true;
  if (pathname.startsWith("/convite/")) return true;
  if (pathname.startsWith("/e/")) return true;
  if (pathname.startsWith("/inscricao/")) return true;
  if (pathname.startsWith("/entrar")) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/demo")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

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
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const loginUrl = loginHubPath(tenantSlug);
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  try {
    await jwtVerify(token, authSecret());
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    const response = NextResponse.redirect(new URL(loginHubPath(tenantSlug), request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
