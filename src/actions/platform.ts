"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { resetUserByEmail } from "@/lib/reset-user";
import { SCHOOL_VERIFICATION_STATUS } from "@/lib/school-verification";
import { notifySchoolVerificationChange } from "@/lib/sync-school-verification";

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

  const previous = school.verificationStatus;
  if (previous === SCHOOL_VERIFICATION_STATUS.verified) {
    return { success: true, schoolName: school.name };
  }

  await prisma.school.update({
    where: { id: schoolId },
    data: {
      verificationStatus: SCHOOL_VERIFICATION_STATUS.verified,
      cnpjCheckedAt: new Date(),
    },
  });

  revalidatePlatform();
  await notifySchoolVerificationChange(
    schoolId,
    previous as (typeof SCHOOL_VERIFICATION_STATUS)[keyof typeof SCHOOL_VERIFICATION_STATUS],
    SCHOOL_VERIFICATION_STATUS.verified
  );
  return { success: true, schoolName: school.name };
}

export async function rejectSchoolAction(formData: FormData) {
  const gate = await requirePlatformAdmin();
  if (!gate.ok) return { error: gate.error };

  const schoolId = String(formData.get("schoolId") ?? "");
  if (!schoolId) return { error: "Escola inválida." };

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return { error: "Escola não encontrada." };

  const previous = school.verificationStatus;
  if (previous === SCHOOL_VERIFICATION_STATUS.rejected) {
    return { success: true };
  }

  await prisma.school.update({
    where: { id: schoolId },
    data: { verificationStatus: SCHOOL_VERIFICATION_STATUS.rejected },
  });

  revalidatePlatform();
  await notifySchoolVerificationChange(
    schoolId,
    previous as (typeof SCHOOL_VERIFICATION_STATUS)[keyof typeof SCHOOL_VERIFICATION_STATUS],
    SCHOOL_VERIFICATION_STATUS.rejected
  );
  return { success: true };
}

export async function resetPlatformUserAction(formData: FormData) {
  const gate = await requirePlatformAdmin();
  if (!gate.ok) return { error: gate.error };

  const email = String(formData.get("email") ?? "");
  const result = await resetUserByEmail(email);
  if (!result.ok) return { error: result.error };

  revalidatePlatform();
  revalidatePath("/login");
  revalidatePath("/registro");

  if (!result.found) {
    return { success: true, message: "E-mail já estava livre para cadastro." };
  }

  return {
    success: true,
    message: result.removedSchool
      ? `Instituição e ${result.removedUsers} usuário(s) removidos.`
      : "Usuário removido.",
  };
}

export async function fetchPendingSchoolsForPlatform() {
  const gate = await requirePlatformAdmin();
  if (!gate.ok) return [];

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
