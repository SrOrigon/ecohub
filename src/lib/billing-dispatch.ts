import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit-logger";
import { decryptSecret } from "@/lib/security/crypto-vault";
import { generatePixQrCodeDataUrl, generateSyntheticPixCopyPaste } from "@/lib/payment-gateway";
import {
  buildBillingMessageText,
  sendWhatsAppCloudMessage,
  sendWhatsAppWebhookMessage,
} from "@/lib/whatsapp-billing";
import { listBillingCharges } from "@/lib/billing-charges";
import {
  type BillingCharge,
  formatDueDate,
  isInsideRemindWindow,
  isOpenStanding,
  monthKey,
  referenceMonthLabel,
} from "@/lib/billing-status";

export type BillingDispatchResult = {
  configured: boolean;
  sent: number;
  failed: number;
  skipped: number;
  prepared: number;
  pendingCount: number;
  message: string;
  items: Array<{
    studentName: string;
    phone: string | null;
    status: "SENT" | "FAILED" | "SKIPPED";
    detail: string;
  }>;
};

const COOLDOWN_MS = 20 * 60 * 60 * 1000;

export async function dispatchSchoolWhatsAppBilling(
  schoolId: string,
  options?: {
    studentId?: string;
    chargeId?: string;
    actorId?: string;
    actorRole?: string;
  }
): Promise<BillingDispatchResult> {
  const [school, config] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
    prisma.schoolPaymentConfig.findUnique({ where: { schoolId } }),
  ]);

  if (config && config.whatsappBillingEnabled === false && !options?.chargeId) {
    return emptyResult("A cobrança automática pelo WhatsApp está desligada nesta escola.");
  }

  const remindDays = config?.whatsappRemindDaysBefore ?? 3;
  await syncOverdue(schoolId);
  const explicitPlanId = options?.chargeId?.startsWith("plan:") ? options.chargeId : null;
  const materializedId = explicitPlanId ? await materializePlanId(schoolId, explicitPlanId) : null;
  const prepared = await ensureDueInvoices(schoolId, options?.studentId, remindDays);
  const charges = await listBillingCharges(schoolId, options?.studentId);
  const targets = selectTargets(charges, remindDays, materializedId ?? options?.chargeId);

  const channel = resolveChannel(config);
  if (!channel) {
    return {
      configured: false,
      sent: 0,
      failed: 0,
      skipped: targets.length,
      prepared,
      pendingCount: targets.length,
      message:
        prepared > 0
          ? `${prepared} cobrança(s) preparada(s). Conecte o WhatsApp Business em Configurações → Pagamentos para o envio automático.`
          : "Conecte o WhatsApp Business em Configurações → Pagamentos para enviar as cobranças automaticamente.",
      items: targets.map((charge) => ({
        studentName: charge.studentName,
        phone: charge.parentPhone,
        status: "SKIPPED" as const,
        detail: "WhatsApp Business ainda não configurado.",
      })),
    };
  }

  const since = new Date(Date.now() - COOLDOWN_MS);
  const recent = await prisma.whatsAppBillingLog.findMany({
    where: {
      schoolId,
      createdAt: { gte: since },
      invoiceId: { in: targets.map((charge) => charge.id) },
    },
    select: { invoiceId: true, status: true },
  });
  const recentlyTouched = new Set(
    recent.filter((row) => row.status === "SENT" || row.status === "SKIPPED").map((row) => row.invoiceId)
  );

  const items: BillingDispatchResult["items"] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const charge of targets.slice(0, 40)) {
    if (!options?.chargeId && recentlyTouched.has(charge.id)) {
      skipped += 1;
      items.push({
        studentName: charge.studentName,
        phone: charge.parentPhone,
        status: "SKIPPED",
        detail: "Cobrança já enviada nas últimas 20 horas.",
      });
      continue;
    }

    if (!charge.parentPhone) {
      skipped += 1;
      await writeLog(schoolId, charge, "SKIPPED", channel.provider, "Responsável sem WhatsApp.");
      items.push({
        studentName: charge.studentName,
        phone: null,
        status: "SKIPPED",
        detail: "Responsável sem WhatsApp cadastrado.",
      });
      continue;
    }

    const due = new Date(charge.dueDate);
    const text = buildBillingMessageText({
      parentName: charge.parentName || "Responsável",
      studentName: charge.studentName,
      schoolName: school?.name || "Ecohub",
      amount: charge.amountCents / 100,
      dueDate: formatDueDate(due),
      referenceMonth: referenceMonthLabel(due),
      pixCode: charge.pixCopyPaste,
    });

    const delivery =
      channel.provider === "CLOUD_API"
        ? await sendWhatsAppCloudMessage({
            phone: charge.parentPhone,
            text,
            phoneNumberId: channel.phoneNumberId,
            accessToken: channel.accessToken,
          })
        : await sendWhatsAppWebhookMessage({
            webhookUrl: channel.webhookUrl,
            phone: charge.parentPhone,
            text,
            studentName: charge.studentName,
            amountCents: charge.amountCents,
          });

    if (delivery.ok) {
      sent += 1;
      await writeLog(schoolId, charge, "SENT", channel.provider, null);
      items.push({
        studentName: charge.studentName,
        phone: charge.parentPhone,
        status: "SENT",
        detail: "Cobrança enviada no WhatsApp.",
      });
    } else {
      failed += 1;
      await writeLog(schoolId, charge, "FAILED", channel.provider, delivery.error);
      items.push({
        studentName: charge.studentName,
        phone: charge.parentPhone,
        status: "FAILED",
        detail: delivery.error,
      });
    }
  }

  if (options?.actorId) {
    await logAuditEvent({
      schoolId,
      actorId: options.actorId,
      actorRole: options.actorRole ?? "secretary",
      action: "WHATSAPP_BILLING_DISPATCH",
      entityType: "WhatsAppBillingLog",
      diffAfter: { sent, failed, skipped, prepared },
    });
  }

  return {
    configured: true,
    sent,
    failed,
    skipped,
    prepared,
    pendingCount: targets.length,
    message: `${sent} cobrança(s) enviada(s) no WhatsApp${failed ? `, ${failed} falha(s)` : ""}.`,
    items,
  };
}

function emptyResult(message: string): BillingDispatchResult {
  return {
    configured: false,
    sent: 0,
    failed: 0,
    skipped: 0,
    prepared: 0,
    pendingCount: 0,
    message,
    items: [],
  };
}

function selectTargets(charges: BillingCharge[], remindDays: number, chargeId?: string) {
  if (chargeId) {
    return charges.filter((charge) => charge.id === chargeId && charge.standing !== "paid");
  }
  const now = new Date();
  return charges.filter((charge) => {
    if (charge.standing === "paid") return false;
    if (charge.kind === "plan") return false;
    return isOpenStanding(charge.standing) || isInsideRemindWindow(new Date(charge.dueDate), remindDays, now);
  });
}

async function syncOverdue(schoolId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.studentInvoice.updateMany({
    where: { schoolId, status: "PENDING", dueDate: { lt: today } },
    data: { status: "OVERDUE" },
  });
  await prisma.invoice.updateMany({
    where: { schoolId, status: "PENDING", dueDate: { lt: today } },
    data: { status: "OVERDUE" },
  });
}

async function materializePlanId(schoolId: string, planId: string) {
  const parsed = parsePlanId(planId);
  if (!parsed) return null;
  const charges = await listBillingCharges(schoolId, parsed.studentId);
  const plan = charges.find((charge) => charge.id === planId && charge.standing !== "paid");
  if (!plan) {
    const existing = charges.find(
      (charge) =>
        charge.studentId === parsed.studentId &&
        monthKey(new Date(charge.dueDate)) === parsed.month &&
        charge.kind !== "plan"
    );
    return existing?.id ?? null;
  }
  const created = await createChargeInvoice(schoolId, plan);
  return created?.id ?? plan.id;
}

function parsePlanId(planId: string) {
  const body = planId.slice("plan:".length);
  const month = body.slice(-7);
  const studentId = body.slice(0, -8);
  if (!/^\d{4}-\d{2}$/.test(month) || !studentId) return null;
  return { studentId, month };
}

async function ensureDueInvoices(schoolId: string, studentId: string | undefined, remindDays: number) {
  const charges = await listBillingCharges(schoolId, studentId);
  const now = new Date();
  const duePlans = charges.filter(
    (charge) =>
      charge.kind === "plan" &&
      charge.standing !== "paid" &&
      isInsideRemindWindow(new Date(charge.dueDate), remindDays, now)
  );

  if (duePlans.length === 0) return 0;

  let created = 0;
  for (const plan of duePlans) {
    const result = await createChargeInvoice(schoolId, plan);
    if (result?.created) created += 1;
  }
  return created;
}

async function createChargeInvoice(schoolId: string, plan: BillingCharge) {
  const due = new Date(plan.dueDate);
  const monthStart = new Date(due.getFullYear(), due.getMonth(), 1);
  const monthEnd = new Date(due.getFullYear(), due.getMonth() + 1, 1);
  const existing = await prisma.studentInvoice.findFirst({
    where: {
      schoolId,
      studentId: plan.studentId,
      dueDate: { gte: monthStart, lt: monthEnd },
      status: { notIn: ["CANCELED", "REFUNDED"] },
    },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const config = await prisma.schoolPaymentConfig.findUnique({
    where: { schoolId },
    select: { id: true, pixKey: true },
  });
  const externalId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const pixCopy = config?.pixKey?.trim()
    ? config.pixKey.trim()
    : generateSyntheticPixCopyPaste(externalId, plan.amountCents);

  const invoice = await prisma.studentInvoice.create({
    data: {
      schoolId,
      studentId: plan.studentId,
      title: plan.title,
      amountCents: plan.amountCents,
      dueDate: due,
      status: plan.standing === "overdue" ? "OVERDUE" : "PENDING",
      paymentMethodId: config?.id ?? null,
      pixCopyPaste: pixCopy,
      pixQrCodeBase64: generatePixQrCodeDataUrl(pixCopy),
      externalInvoiceId: externalId,
    },
    select: { id: true },
  });
  return { id: invoice.id, created: true };
}

function resolveChannel(
  config: {
    whatsappPhoneNumberId: string | null;
    encryptedWhatsappToken: string | null;
  } | null
):
  | { provider: "CLOUD_API"; phoneNumberId: string; accessToken: string }
  | { provider: "WEBHOOK"; webhookUrl: string }
  | null {
  const phoneNumberId = config?.whatsappPhoneNumberId?.trim() || process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  let accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "";
  if (config?.encryptedWhatsappToken) {
    try {
      accessToken = decryptSecret(config.encryptedWhatsappToken);
    } catch {
      accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "";
    }
  }
  if (phoneNumberId && accessToken) {
    return { provider: "CLOUD_API", phoneNumberId, accessToken };
  }

  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL?.trim();
  if (webhookUrl) return { provider: "WEBHOOK", webhookUrl };
  return null;
}

async function writeLog(
  schoolId: string,
  charge: BillingCharge,
  status: string,
  provider: string,
  error: string | null
) {
  await prisma.whatsAppBillingLog.create({
    data: {
      schoolId,
      invoiceKind: charge.kind,
      invoiceId: charge.id,
      studentId: charge.studentId,
      phone: charge.parentPhone || "",
      status,
      provider,
      error,
    },
  });
}
