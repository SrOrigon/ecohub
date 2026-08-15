import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness probe — responde sem tocar no banco (Railway healthcheck). */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      live: true,
      service: "ecohub",
      uptime: process.uptime(),
    },
    { status: 200 }
  );
}
