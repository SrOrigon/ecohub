import { NextResponse } from "next/server";
import { authorizeMaintenanceRequest } from "@/lib/maintenance-auth";
import { repairUserPassword } from "@/lib/reset-user";
import { validatePassword } from "@/lib/security/password-policy";

export const dynamic = "force-dynamic";

/** POST { email, password } — regrava hash de senha (cadastro/CNPJ permanecem). */
export async function POST(request: Request) {
  if (!authorizeMaintenanceRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const passwordCheck = validatePassword(body.password ?? "");
  if (!passwordCheck.ok) {
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
  }

  const result = await repairUserPassword(body.email ?? "", body.password ?? "");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (!result.found) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: "Senha corrigida. Faça login novamente.",
    email: result.email,
  });
}
