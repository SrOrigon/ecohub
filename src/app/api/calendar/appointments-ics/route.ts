import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildAppointmentsIcs } from "@/lib/ics-export";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instructorId = searchParams.get("instructorId");

  const user = await getSessionUser();
  if (!user?.schoolId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    select: { name: true },
  });

  const whereClause: any = {
    schoolId: user.schoolId,
    status: { not: "CANCELLED" },
  };

  if (user.role === "teacher") {
    whereClause.instructor = { userId: user.id };
  } else if (instructorId) {
    whereClause.instructorProfileId = instructorId;
  }

  const appointments = await prisma.appointment.findMany({
    where: whereClause,
    include: {
      service: true,
      instructor: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { date: "asc" },
  });

  const ics = buildAppointmentsIcs(
    appointments.map((a) => ({
      id: a.id,
      studentName: a.studentName,
      studentWhatsapp: a.studentWhatsapp,
      serviceName: a.service.name,
      instructorName: a.instructor.user.fullName,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      isOnline: a.service.isOnline,
      schoolName: school?.name ?? "Ecohub",
    })),
    `Agendamentos - ${school?.name ?? "Ecohub"}`
  );

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agendamentos-${user.schoolId}.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
