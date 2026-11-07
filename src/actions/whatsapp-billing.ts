"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { dispatchSchoolWhatsAppBilling, type BillingDispatchResult } from "@/lib/billing-dispatch";

export async function dispatchWhatsAppBillingAction(input?: {
  studentId?: string;
  chargeId?: string;
}): Promise<{ error: string } | ({ success: true } & BillingDispatchResult)> {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const result = await dispatchSchoolWhatsAppBilling(user.schoolId, {
    studentId: input?.studentId,
    chargeId: input?.chargeId,
    actorId: user.id,
    actorRole: user.role,
  });

  revalidatePath("/dashboard/financeiro");
  revalidatePath("/dashboard/alunos");
  revalidatePath("/dashboard/responsavel");
  if (input?.studentId) revalidatePath(`/dashboard/alunos/${input.studentId}`);

  return { success: true as const, ...result };
}
