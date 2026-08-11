import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLiveMetricsSnapshot } from "@/lib/live-metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const snapshot = await getLiveMetricsSnapshot(user);
  return NextResponse.json(snapshot);
}
