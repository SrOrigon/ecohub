#!/usr/bin/env node
/**
 * Cria cookie de sessão para scripts de varredura locais.
 * Uso: import { createScanSessionCookies } from "./scan-session.mjs"
 */
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const SESSION_COOKIE = "eduhub_session";
const TENANT_COOKIE = "eduhub_tenant";

function getAuthSecretBytes() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret && secret.length >= 32) {
    return new TextEncoder().encode(secret);
  }
  if (process.env.NODE_ENV === "production") {
    return new TextEncoder().encode("eduhub-build-placeholder-secret-do-not-use-at-runtime-32");
  }
  return new TextEncoder().encode("eduhub-dev-secret-change-in-production");
}

export async function createScanSessionCookies(options = {}) {
  const email = options.email ?? process.env.SCAN_LOGIN_EMAIL ?? "diretor.piloto@instituicao.local";
  const role = options.role ?? "director";
  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findFirst({
      where: { email, role },
      include: { school: { select: { slug: true } } },
    });

    if (!user) {
      throw new Error(
        `Usuário ${email} (${role}) não encontrado. Rode npm run db:pilot ou defina SCAN_LOGIN_EMAIL.`
      );
    }

    const token = await new SignJWT({
      userId: user.id,
      schoolId: user.schoolId,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .setIssuedAt()
      .sign(getAuthSecretBytes());

    const cookies = new Map([[SESSION_COOKIE, token]]);
    if (user.school?.slug) {
      cookies.set(TENANT_COOKIE, user.school.slug);
    }

    return cookies;
  } finally {
    await prisma.$disconnect();
  }
}

export { SESSION_COOKIE, TENANT_COOKIE };
