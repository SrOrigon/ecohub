import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = today.getDate();
    const month = today.getMonth(); // 0 = Jan, 1 = Feb, etc.

    // Determine which frequencies need resetting today
    const frequenciesToReset: string[] = ["DAILY"];

    if (dayOfWeek === 1) {
      frequenciesToReset.push("WEEKLY");
    }

    if (dayOfMonth === 1) {
      frequenciesToReset.push("MONTHLY");
      // Bimestral: Every 1st day of odd months (Jan=0, Mar=2, May=4, Jul=6, Sep=8, Nov=10)
      if (month % 2 === 0) {
        frequenciesToReset.push("BIMESTRAL");
      }
    }

    // Find all active missions with autoReset that match these frequencies
    const missionsToReset = await prisma.mission.findMany({
      where: {
        isActive: true,
        autoReset: true,
        frequency: { in: frequenciesToReset },
      },
      select: { id: true },
    });

    if (missionsToReset.length === 0) {
      return NextResponse.json({
        message: "No missions to reset today.",
        frequenciesChecked: frequenciesToReset,
      });
    }

    const missionIds = missionsToReset.map((m) => m.id);

    // Delete StudentMission records to allow them to complete it again
    const result = await prisma.studentMission.deleteMany({
      where: { missionId: { in: missionIds } },
    });

    return NextResponse.json({
      message: "Missions reset successfully.",
      missionsAffected: missionIds.length,
      studentMissionsCleared: result.count,
      frequenciesChecked: frequenciesToReset,
    });
  } catch (error) {
    console.error("[CRON_RESET_MISSIONS] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
