import { prisma } from "@/lib/db";
import { listBillingCharges } from "@/lib/billing-charges";
import { isInsideRemindWindow, type BillingCharge } from "@/lib/billing-status";
import type { SchoolPaymentInstructions } from "@/components/parents/parent-finance-card";

export async function getSchoolPaymentInstructions(schoolId: string): Promise<SchoolPaymentInstructions | null> {
  const config = await prisma.schoolPaymentConfig.findUnique({
    where: { schoolId },
    select: {
      isActive: true,
      beneficiaryName: true,
      pixKey: true,
      pixKeyType: true,
      bankName: true,
      instructions: true,
    },
  });
  if (!config?.isActive) return null;
  return {
    beneficiaryName: config.beneficiaryName?.trim() || null,
    pixKey: config.pixKey?.trim() || null,
    pixKeyType: config.pixKeyType?.trim() || null,
    bankName: config.bankName?.trim() || null,
    instructions: config.instructions?.trim() || null,
  };
}

export async function listChargesForChildren(schoolId: string, studentIds: string[]) {
  const entries = await Promise.all(
    studentIds.map(async (id) => [id, await listBillingCharges(schoolId, id).catch(() => [])] as const)
  );
  return new Map<string, BillingCharge[]>(entries);
}

export async function getRemindDaysBefore(schoolId: string) {
  const config = await prisma.schoolPaymentConfig.findUnique({
    where: { schoolId },
    select: { whatsappRemindDaysBefore: true },
  });
  return Math.max(0, config?.whatsappRemindDaysBefore ?? 0);
}

export function chargesToRemind(charges: BillingCharge[], remindDays: number, now = new Date()) {
  return charges.filter(
    (charge) => charge.standing !== "paid" && isInsideRemindWindow(new Date(charge.dueDate), remindDays, now)
  );
}
