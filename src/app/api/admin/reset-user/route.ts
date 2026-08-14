import { NextResponse } from "next/server";
import { resetUserByEmail } from "@/lib/reset-user";

export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const secret =
    process.env.MAINTENANCE_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "";
  return !!secret && token.length >= 32 && token === secret;
}

/** POST { "email": "..." } — libera e-mail para novo cadastro (uso operacional). */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const result = await resetUserByEmail(body.email ?? "");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (!result.found) {
    return NextResponse.json({
      success: true,
      message: "E-mail já estava livre para cadastro.",
      email: body.email?.trim().toLowerCase(),
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
