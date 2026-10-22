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
  if (!["admin", "director", "secretary", "teacher"].includes(user.role)) redirect("/dashboard");

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
    where: {
      schoolId: school.id,
      isActive: true,
      ...(user.role === "teacher" ? { userId: user.id } : {}),
    },
    include: { user: true },
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
