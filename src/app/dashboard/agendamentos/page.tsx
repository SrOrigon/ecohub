import { getSessionUser } from "@/lib/auth";
import { getSchool } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarGrid } from "@/components/scheduling/calendar-grid";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings } from "lucide-react";

export default async function AgendamentosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const school = await getSchool(user);

  const instructors = await prisma.instructorProfile.findMany({
    where: { schoolId: school!.id, isActive: true },
    include: { user: true }
  });

  const services = await prisma.schedulingService.findMany({
    where: { schoolId: school!.id }
  });

  const appointments = await prisma.appointment.findMany({
    where: { schoolId: school!.id },
    include: { instructor: true, service: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Agendamentos"
          description="Visão geral da grade de aulas e atendimentos da instituição."
        />
        {(user.role === "admin" || user.role === "director") && (
          <Link href="/dashboard/agendamentos/configuracoes">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
          </Link>
        )}
      </div>

      <CalendarGrid
        appointments={appointments}
        instructors={instructors}
        services={services}
      />
    </div>
  );
}
