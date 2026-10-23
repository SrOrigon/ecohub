import { getSessionUser } from "@/lib/auth";
import { getSchool } from "@/lib/queries";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SchedulingServiceForm } from "@/components/forms/scheduling-service-form";
import { InstructorAvailabilityForm } from "@/components/forms/instructor-availability-form";

export default async function AgendamentosConfiguracoesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "director") redirect("/dashboard");

  const school = await getSchool(user);
  if (!school) redirect("/dashboard");

  const instructors = await prisma.instructorProfile.findMany({
    where: { schoolId: school!.id, isActive: true },
    include: { user: true }
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Configurações de Agendamento"
        description="Gerencie serviços, durações e horários de atendimento dos instrutores."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Novo Serviço / Aula</CardTitle>
            <CardDescription>Cadastre um novo serviço para agendamento.</CardDescription>
          </CardHeader>
          <CardContent>
            <SchedulingServiceForm instructors={instructors} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horários de Atendimento</CardTitle>
            <CardDescription>Defina a disponibilidade de cada instrutor.</CardDescription>
          </CardHeader>
          <CardContent>
            <InstructorAvailabilityForm instructors={instructors} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
