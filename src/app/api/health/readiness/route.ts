import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const now = new Date().toISOString();
  let isReady = true;

  // 1. Database Read and Write Latency Check
  let readLatencyMs = -1;
  let writeLatencyMs = -1;
  let dbStatus = "ok";

  try {
    const startRead = performance.now();
    await prisma.school.count();
    readLatencyMs = Math.round(performance.now() - startRead);

    const startWrite = performance.now();
    await prisma.appMeta.upsert({
      where: { key: "readiness_heartbeat" },
      create: { key: "readiness_heartbeat", value: now },
      update: { value: now },
    });
    writeLatencyMs = Math.round(performance.now() - startWrite);
  } catch (error) {
    dbStatus = "error";
    isReady = false;
    console.error("[readiness] Database check failed:", error);
  }

  // 2. Environment Variables Integrity Check
  const authSecret = process.env.AUTH_SECRET;
  const dbUrl = process.env.DATABASE_URL;

  const envCheck = {
    authSecret: authSecret && authSecret.length >= 16 ? "ok" : "missing_or_short",
    databaseUrl: dbUrl ? "ok" : "missing",
  };

  if (envCheck.authSecret !== "ok" || envCheck.databaseUrl !== "ok") {
    isReady = false;
  }

  // 3. Node Process Memory Usage
  const mem = process.memoryUsage();
  const memoryInfo = {
    rssMb: Number((mem.rss / (1024 * 1024)).toFixed(2)),
    heapTotalMb: Number((mem.heapTotal / (1024 * 1024)).toFixed(2)),
    heapUsedMb: Number((mem.heapUsed / (1024 * 1024)).toFixed(2)),
    externalMb: Number((mem.external / (1024 * 1024)).toFixed(2)),
  };

  const responsePayload = {
    status: isReady ? "ready" : "not_ready",
    timestamp: now,
    database: {
      status: dbStatus,
      readLatencyMs,
      writeLatencyMs,
    },
    environment: envCheck,
    memory: memoryInfo,
  };

  return NextResponse.json(responsePayload, {
    status: isReady ? 200 : 503,
  });
}
