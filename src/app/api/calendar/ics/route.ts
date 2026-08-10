import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { prisma } from "@/lib/db";
import { buildSchoolCalendarIcs } from "@/lib/ics-export";

export async function GET() {
  const user = await getSessionUser();
  if (!user?.schoolId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const [settings, school] = await Promise.all([
    getSchoolSettings(user.schoolId),
    prisma.school.findUnique({ where: { id: user.schoolId }, select: { name: true } }),
  ]);

  const ics = buildSchoolCalendarIcs(settings, school?.name ?? "EduHub");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="calendario-${user.schoolId}.ics"`,
    },
  });
}
