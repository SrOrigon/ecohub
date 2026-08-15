import { NextResponse } from "next/server";
import { findUserByEmailForLogin } from "@/lib/auth-credentials";
import { authorizeMaintenanceRequest } from "@/lib/maintenance-auth";
import { prisma } from "@/lib/db";
import { isUsableAuthSecret } from "@/lib/auth-secret-runtime";

export const dynamic = "force-dynamic";

/** POST { email } — diagnóstico de login (não expõe senha). */
export async function POST(request: Request) {
  if (!authorizeMaintenanceRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Informe o e-mail." }, { status: 400 });
  }

  const user = await findUserByEmailForLogin(email);
  const [userCount, schoolCount] = await Promise.all([
    prisma.user.count(),
    prisma.school.count(),
  ]);

  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const databasePath = databaseUrl.replace(/^file:/, "");

  return NextResponse.json({
    email,
    userExists: !!user,
    role: user?.role ?? null,
    schoolId: user?.schoolId ?? null,
    passwordHashValid: !!user?.passwordHash?.startsWith("$2"),
    userCount,
    schoolCount,
    databasePath: databasePath || null,
    onPersistentVolume: databasePath.startsWith("/data/"),
    authSecretConfigured: isUsableAuthSecret(process.env.AUTH_SECRET),
    institutionalMode:
      process.env.ECOHUB_INSTITUTIONAL === "1" ||
      process.env.ECOHUB_INSTITUTIONAL === "true",
  });
}
