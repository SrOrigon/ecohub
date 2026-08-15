import { getSessionUser } from "@/lib/auth";
import { getNotificationSnapshot } from "@/lib/notification-snapshot";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const snapshot = await getNotificationSnapshot(user.id, 8);
  return NextResponse.json(snapshot);
}
