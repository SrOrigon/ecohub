import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let dbOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const demoMode =
    process.env.EDUHUB_ENABLE_DEMO === "1" || process.env.EDUHUB_ENABLE_DEMO === "true";
  const authConfigured =
    !!process.env.AUTH_SECRET?.trim() && process.env.AUTH_SECRET.trim().length >= 32;

  const status = dbOk ? "ok" : "degraded";
  const httpStatus = dbOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      service: "eduhub",
      version: process.env.npm_package_version ?? "0.1.0",
      uptime: process.uptime(),
      checks: {
        database: dbOk ? "ok" : "error",
        authSecret: authConfigured || demoMode ? "ok" : "missing",
      },
      mode: demoMode ? "demo" : "institutional",
      responseMs: Date.now() - started,
    },
    { status: httpStatus }
  );
}
