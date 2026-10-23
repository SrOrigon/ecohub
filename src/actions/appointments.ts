"use server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { buildWhatsAppLink } from "@/lib/whatsapp-billing";
import { sanitizeBrazilianPhone } from "@/lib/whatsapp-billing";

export async function createSchedulingServiceAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "director")) {
    return { error: "Não autorizado" };
  }

  const name = formData.get("name") as string;
  const durationMinutes = parseInt(formData.get("durationMinutes") as string);
  const maxStudentsPerSlot = parseInt(formData.get("maxStudentsPerSlot") as string);
  const isOnline = formData.get("isOnline") === "true";
  const instructorIdsStr = formData.get("instructorIds") as string;

  if (!name || isNaN(durationMinutes) || isNaN(maxStudentsPerSlot) || !instructorIdsStr) {
    return { error: "Dados inválidos" };
  }

  try {
    const instructorIds = JSON.parse(instructorIdsStr) as string[];

    const service = await prisma.schedulingService.create({
      data: {
        schoolId: user.schoolId!,
        name,
        durationMinutes,
        maxStudentsPerSlot,
        isOnline
      }
    });

    for (const instructorId of instructorIds) {
       await prisma.instructorService.create({
         data: {
           instructorProfileId: instructorId,
           schedulingServiceId: service.id
         }
       });
    }

    revalidatePath("/dashboard/agendamentos/configuracoes");
    return { success: true };
  } catch (error) {
    console.error("Error creating service:", error);
    return { error: "Erro ao criar serviço" };
  }
}

export async function createAvailabilityAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "director")) {
    return { error: "Não autorizado" };
  }

  const instructorProfileId = formData.get("instructorProfileId") as string;
  const dayOfWeek = parseInt(formData.get("dayOfWeek") as string);
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;

  if (!instructorProfileId || isNaN(dayOfWeek) || !startTime || !endTime) {
    return { error: "Dados inválidos" };
  }

  try {
    await prisma.instructorAvailability.create({
      data: {
        instructorProfileId,
        dayOfWeek,
        startTime,
        endTime,
        isActive: true
      }
    });

    revalidatePath("/dashboard/agendamentos/configuracoes");
    return { success: true };
  } catch (error) {
    console.error("Error creating availability:", error);
    return { error: "Erro ao criar disponibilidade" };
  }
}

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export async function getAvailableSlotsAction(schoolId: string, serviceId: string, instructorId: string, dateStr: string) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();

    // Find service to get duration
    const service = await prisma.schedulingService.findUnique({
        where: { id: serviceId }
    });
    if (!service) return { error: "Serviço não encontrado" };

    // Check if instructor is assigned to service (if a specific one is selected)
    if (instructorId !== "any") {
        const link = await prisma.instructorService.findUnique({
            where: { instructorProfileId_schedulingServiceId: { instructorProfileId: instructorId, schedulingServiceId: serviceId } }
        });
        if (!link) return { error: "Profissional não atende este serviço" };
    }

    // Get availabilities
    const whereAvail: any = { dayOfWeek, isActive: true };
    if (instructorId !== "any") {
        whereAvail.instructorProfileId = instructorId;
    } else {
        // Find instructors who CAN teach this service
        const allowedLinks = await prisma.instructorService.findMany({
            where: { schedulingServiceId: serviceId }
        });
        const allowedIds = allowedLinks.map((l: any) => l.instructorProfileId);
        whereAvail.instructorProfileId = { in: allowedIds };
    }

    const availabilities = await prisma.instructorAvailability.findMany({
        where: whereAvail
    });

    if (availabilities.length === 0) return { slots: [] };

    // Get appointments for that day for these instructors
    const instructorIds = availabilities.map((a: any) => a.instructorProfileId);
    const appointments = await prisma.appointment.findMany({
        where: {
            instructorProfileId: { in: instructorIds },
            date: {
                gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                lt: new Date(new Date(date).setHours(23, 59, 59, 999))
            },
            status: { not: "CANCELLED" }
        }
    });

    const duration = service.durationMinutes;
    const allSlots = [];

    // Simple slot generation for each availability
    // Generates slots from startTime to endTime in increments of duration
    for (const avail of availabilities) {
        let currentMinutes = timeToMinutes(avail.startTime);
        const endMinutes = timeToMinutes(avail.endTime);

        while (currentMinutes + duration <= endMinutes) {
            const h = Math.floor(currentMinutes / 60).toString().padStart(2, "0");
            const m = (currentMinutes % 60).toString().padStart(2, "0");
            const slotStart = `${h}:${m}`;

            const nextMinutes = currentMinutes + duration;
            const nh = Math.floor(nextMinutes / 60).toString().padStart(2, "0");
            const nm = (nextMinutes % 60).toString().padStart(2, "0");
            const slotEnd = `${nh}:${nm}`;

            // Check conflicts for THIS instructor
            const instructorApps = appointments.filter((app: any) => app.instructorProfileId === avail.instructorProfileId);

            let bookedCount = 0;
            for (const app of instructorApps) {
                const appStartMins = timeToMinutes(app.startTime);
                const appEndMins = timeToMinutes(app.endTime);

                // Overlap condition: Max(StartA, StartB) < Min(EndA, EndB)
                if (Math.max(currentMinutes, appStartMins) < Math.min(nextMinutes, appEndMins)) {
                    bookedCount++;
                }
            }

            if (bookedCount < service.maxStudentsPerSlot) {
                allSlots.push({ time: slotStart, instructorId: avail.instructorProfileId });
            }

            currentMinutes += duration;
        }
    }

    // Return unique start times
    const uniqueTimes = [...new Set(allSlots.map(s => s.time))].sort();
    return { slots: uniqueTimes, rawSlots: allSlots };
}

export async function createAppointmentAction(formData: FormData) {
  const schoolId = formData.get("schoolId") as string;
  const schedulingServiceId = formData.get("schedulingServiceId") as string;
  let instructorProfileId = formData.get("instructorProfileId") as string;
  const studentName = formData.get("studentName") as string;
  let studentWhatsapp = formData.get("studentWhatsapp") as string;
  const studentEmail = formData.get("studentEmail") as string | null;
  const dateStr = formData.get("date") as string;
  const startTime = formData.get("startTime") as string;
  const anyInstructorRawSlots = formData.get("anyInstructorRawSlots") as string;

  if (!schoolId || !schedulingServiceId || !instructorProfileId || !studentName || !studentWhatsapp || !dateStr || !startTime) {
    return { error: "Por favor, preencha todos os campos obrigatórios." };
  }

  try {
    const service = await prisma.schedulingService.findUnique({
      where: { id: schedulingServiceId }
    });

    if (!service) return { error: "Serviço não encontrado." };

    const school = await prisma.school.findUnique({
      where: { id: schoolId }
    });

    if (!school) return { error: "Escola não encontrada." };

    if (instructorProfileId === "any" && anyInstructorRawSlots) {
        const rawSlots = JSON.parse(anyInstructorRawSlots);
        const matchingSlot = rawSlots.find((s: any) => s.time === startTime);
        if (!matchingSlot) return { error: "Nenhum profissional disponível neste horário." };
        instructorProfileId = matchingSlot.instructorId;
    }

    const date = new Date(dateStr);

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + service.durationMinutes;
    const h = Math.floor(endMinutes / 60).toString().padStart(2, "0");
    const m = (endMinutes % 60).toString().padStart(2, "0");
    const endTime = `${h}:${m}`;

    // Overlapping logic check during creation
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        instructorProfileId,
        date: {
          gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          lt: new Date(new Date(date).setHours(23, 59, 59, 999))
        },
        status: { not: "CANCELLED" }
      }
    });

    let bookedCount = 0;
    for (const app of existingAppointments) {
        const appStartMins = timeToMinutes(app.startTime);
        const appEndMins = timeToMinutes(app.endTime);
        if (Math.max(startMinutes, appStartMins) < Math.min(endMinutes, appEndMins)) {
            bookedCount++;
        }
    }

    if (bookedCount >= service.maxStudentsPerSlot) {
      return { error: "Este horário já está lotado devido a outra aula sobreposta. Por favor, escolha outro." };
    }

    studentWhatsapp = sanitizeBrazilianPhone(studentWhatsapp);

    const appointment = await prisma.appointment.create({
      data: {
        schoolId,
        schedulingServiceId,
        instructorProfileId,
        studentName,
        studentWhatsapp,
        studentEmail,
        date: new Date(dateStr),
        startTime,
        endTime,
        status: "PENDING"
      }
    });

    revalidatePath(`/agendar/${school.slug}`);
    revalidatePath("/dashboard/agendamentos");

    const message = `Olá! Meu nome é *${studentName}* e gostaria de confirmar meu agendamento para *${service.name}* no dia ${date.toLocaleDateString("pt-BR")} às ${startTime}.`;
    const whatsappUrl = buildWhatsAppLink(studentWhatsapp, message);

    return { success: true, url: whatsappUrl, appointmentId: appointment.id };
  } catch (error) {
    console.error("Error creating appointment:", error);
    return { error: "Ocorreu um erro ao processar o agendamento." };
  }
}
