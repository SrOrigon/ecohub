import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAttentionAlertsSnapshot } from "@/lib/attention-alerts";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "director", "secretary", "teacher", "parent", "student"];

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const snapshot = await getAttentionAlertsSnapshot(user);
  return NextResponse.json(snapshot);
}
