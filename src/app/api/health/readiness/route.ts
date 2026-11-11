import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready" });
  } catch (error) {
    console.error("[readiness] Database check failed:", error);
    return NextResponse.json({ status: "not_ready" }, { status: 503 });
  }
}
