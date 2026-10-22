import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PublicBookingFlow } from "@/components/scheduling/public-booking-flow";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
  });

  if (!school) {
    notFound();
  }

  const services = await prisma.schedulingService.findMany({
    where: { schoolId: school.id }
  });

  const instructors = await prisma.instructorProfile.findMany({
    where: { schoolId: school.id, isActive: true },
    include: { user: true, services: true } // Include services to filter correctly
  });

  const availabilities = await prisma.instructorAvailability.findMany({
    where: { instructor: { schoolId: school.id, isActive: true } }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      <header className="py-6 text-center">
        <h1 className="text-3xl font-black text-indigo-900 tracking-tight">{school.name}</h1>
        <p className="text-muted-foreground mt-2">Agende sua aula ou atendimento online</p>
      </header>

      <main className="flex-1 px-4 pb-12">
        <PublicBookingFlow
          school={school}
          services={services}
          instructors={instructors}
          availabilities={availabilities}
        />
      </main>
    </div>
  );
}
