import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLiveMetricsSnapshot } from "@/lib/live-metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const snapshot = await getLiveMetricsSnapshot(user);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=45" },
    });
  } catch (error) {
    console.error("[GET /api/metrics/live] Error:", error);
    return NextResponse.json({
      version: "0",
      updatedAt: new Date().toISOString(),
      stats: {
        xpThisWeek: 0,
        totalXpAwarded: 0,
        pendingGrading: 0,
        pendingMissionConfirmations: 0,
        activeMissions: 0,
        exerciseSubmissionsToday: 0,
        totalStudents: 0,
        averageGrade: 0,
        attendanceRate: 0,
      },
      activities: [],
    });
  }
}
