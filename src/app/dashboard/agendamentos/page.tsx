import { getSessionUser } from "@/lib/auth";
import { getSchool } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarGrid } from "@/components/scheduling/calendar-grid";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings, Calendar } from "lucide-react";

export default async function AgendamentosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const school = await getSchool(user);
  if (!school) redirect("/login");

  // Garantir que todos os professores da escola possuam perfil de instrutor
  const teachers = await prisma.user.findMany({
    where: { schoolId: school.id, role: "teacher" },
  });

  const colors = ["#4F46E5", "#059669", "#D97706", "#DC2626", "#7C3AED", "#2563EB", "#DB2777"];
  for (let i = 0; i < teachers.length; i++) {
    const teacher = teachers[i];
    await prisma.instructorProfile.upsert({
      where: { userId: teacher.id },
      update: { schoolId: school.id, isActive: true },
      create: {
        userId: teacher.id,
        schoolId: school.id,
        colorCode: colors[i % colors.length],
        isActive: true,
      },
    });
  }

  const instructors = await prisma.instructorProfile.findMany({
    where: { schoolId: school.id, isActive: true },
    include: { user: true }
  });

  const services = await prisma.schedulingService.findMany({
    where: { schoolId: school.id }
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      schoolId: school.id,
      ...(user.role === "teacher" ? { instructor: { userId: user.id } } : {}),
    },
    include: { instructor: true, service: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Agendamentos"
          description={`Visão geral da grade de aulas e atendimentos — ${school.name}.`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <a href="/api/calendar/appointments-ics" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4" />
              Sincronizar Google Agenda (.ics)
            </Button>
          </a>
          <Link href={`/agendar/${school.slug}`} target="_blank">
            <Button variant="secondary">
              Ver Link Público do Aluno
            </Button>
          </Link>
          {["admin", "director", "secretary", "teacher"].includes(user.role) && (
            <Link href="/dashboard/agendamentos/configuracoes">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Configurar Horários e Serviços
              </Button>
            </Link>
          )}
        </div>
      </div>

      <CalendarGrid
        appointments={appointments}
        instructors={instructors}
        services={services}
      />
    </div>
  );
}
