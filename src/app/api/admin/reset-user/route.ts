import { NextResponse } from "next/server";
import { authorizeMaintenanceRequest } from "@/lib/maintenance-auth";
import { resetSchoolBySlug, resetUserByCnpj, resetUserByEmail } from "@/lib/reset-user";

export const dynamic = "force-dynamic";

/** POST { email?, cnpj? } — libera cadastro removendo conta/instituição. */
export async function POST(request: Request) {
  if (!authorizeMaintenanceRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { email?: string; cnpj?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const result = body.slug
    ? await resetSchoolBySlug(body.slug)
    : body.cnpj
      ? await resetUserByCnpj(body.cnpj)
      : await resetUserByEmail(body.email ?? "");

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (!result.found) {
    return NextResponse.json({
      success: true,
      message: "Nenhum cadastro encontrado — já estava livre.",
    });
  }

  return NextResponse.json({
    success: true,
    message: "Conta removida. Pode cadastrar novamente.",
    email: result.email,
    removedSchool: result.removedSchool,
    removedUsers: result.removedUsers,
  });
}
