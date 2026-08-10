"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { SCHOOL_VERIFICATION_STATUS } from "@/lib/school-verification";

function revalidatePlatform() {
  revalidatePath("/dashboard/plataforma");
  revalidatePath("/dashboard/configuracoes");
  revalidatePath("/dashboard");
}

async function requirePlatformAdmin() {
  const user = await requireSession();
  if (!isPlatformAdmin(user.email)) {
    return { ok: false as const, error: "Acesso restrito à equipe da plataforma." };
  }
  return { ok: true as const, user };
}

export async function approveSchoolAction(formData: FormData) {
  const gate = await requirePlatformAdmin();
  if (!gate.ok) return { error: gate.error };

  const schoolId = String(formData.get("schoolId") ?? "");
  if (!schoolId) return { error: "Escola inválida." };

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return { error: "Escola não encontrada." };

  await prisma.school.update({
    where: { id: schoolId },
    data: {
      verificationStatus: SCHOOL_VERIFICATION_STATUS.verified,
      cnpjCheckedAt: new Date(),
    },
  });

  revalidatePlatform();
  return { success: true, schoolName: school.name };
}

export async function rejectSchoolAction(formData: FormData) {
  const gate = await requirePlatformAdmin();
  if (!gate.ok) return { error: gate.error };

  const schoolId = String(formData.get("schoolId") ?? "");
  if (!schoolId) return { error: "Escola inválida." };

  await prisma.school.update({
    where: { id: schoolId },
    data: { verificationStatus: SCHOOL_VERIFICATION_STATUS.rejected },
  });

  revalidatePlatform();
  return { success: true };
}

export async function fetchPendingSchoolsForPlatform(actorEmail: string) {
  if (!isPlatformAdmin(actorEmail)) return [];

  return prisma.school.findMany({
    where: {
      verificationStatus: {
        in: [SCHOOL_VERIFICATION_STATUS.manual_review, SCHOOL_VERIFICATION_STATUS.pending],
      },
    },
    include: {
      users: {
        where: { role: "director" },
        select: { fullName: true, email: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
