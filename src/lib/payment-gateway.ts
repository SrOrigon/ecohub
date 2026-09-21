import { prisma } from "@/lib/db";
import { awardXp } from "@/lib/gamification";
import { getSchoolSettingsForStudent } from "@/lib/school-settings";
import { makeReceiptCode } from "@/lib/student-finance";
import { logAuditEvent } from "@/lib/audit-logger";

export interface CreateInvoiceParams {
  schoolId: string;
  studentId: string;
  amountCents: number;
  dueDate: Date;
}

/**
 * Gera uma string EMV BR Code sintética para cópia e cola do Pix.
 */
export function generateSyntheticPixCopyPaste(
  externalInvoiceId: string,
  amountCents: number
): string {
  const reais = (amountCents / 100).toFixed(2);
  return `00020126580014BR.GOV.BCB.PIX0136ecohub-${externalInvoiceId}520400005303986540${reais.length < 10 ? "0" + reais.length : reais}${reais}5802BR5915Ecohub Pagamentos6009Sao Paulo62070503***63041D2E`;
}

/**
 * Gera um Data URL SVG do QR Code do Pix.
 */
export function generatePixQrCodeDataUrl(pixCopyPaste: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#ffffff"/>
    <rect x="20" y="20" width="160" height="160" fill="#0f172a" rx="12"/>
    <text x="100" y="105" font-family="monospace" font-size="16" font-weight="bold" fill="#38bdf8" text-anchor="middle">PIX QR CODE</text>
    <text x="100" y="130" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">Ecohub Gateway</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function createPixInvoice(params: CreateInvoiceParams) {
  const externalInvoiceId = `inv_pix_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const pixCopyPaste = generateSyntheticPixCopyPaste(externalInvoiceId, params.amountCents);
  const pixQrCode = generatePixQrCodeDataUrl(pixCopyPaste);

  const invoice = await prisma.invoice.create({
    data: {
      schoolId: params.schoolId,
      studentId: params.studentId,
      amountCents: params.amountCents,
      dueDate: params.dueDate,
      status: "PENDING",
      pixCopyPaste,
      pixQrCode,
      externalInvoiceId,
    },
  });

  return invoice;
}

export async function reconcilePaymentEvent(params: {
  externalInvoiceId?: string | null;
  invoiceId?: string | null;
  status: "PAID" | "OVERDUE" | "CANCELED";
  paidAt?: Date;
}) {
  const whereClause = params.invoiceId
    ? { id: params.invoiceId }
    : params.externalInvoiceId
    ? { externalInvoiceId: params.externalInvoiceId }
    : null;

  if (!whereClause) {
    throw new Error("Identificador da cobrança não informado.");
  }

  const invoice = await prisma.invoice.findFirst({
    where: whereClause,
    include: {
      student: { select: { id: true, enrollmentCode: true, financeAccount: true } },
    },
  });

  if (!invoice) {
    throw new Error("Cobrança não encontrada para reconciliação.");
  }

  const paidAt = params.paidAt ?? new Date();

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: params.status,
      paidAt: params.status === "PAID" ? paidAt : invoice.paidAt,
    },
  });

  if (params.status === "PAID" && invoice.status !== "PAID") {
    let account = invoice.student.financeAccount;
    if (!account) {
      account = await prisma.studentFinanceAccount.create({
        data: { studentId: invoice.studentId },
      });
    }

    const settings = await getSchoolSettingsForStudent(invoice.studentId);
    const awardedXp = settings.finance.tuitionXp;
    const awardedCoins = settings.finance.tuitionCoins;

    const payment = await prisma.tuitionPayment.create({
      data: {
        accountId: account.id,
        studentId: invoice.studentId,
        amountCents: invoice.amountCents,
        dueDate: invoice.dueDate,
        paidAt,
        method: "pix_gateway",
        receiptCode: makeReceiptCode(invoice.student.enrollmentCode),
        awardedXp,
        awardedCoins,
        note: `Conciliação automática Pix (${invoice.externalInvoiceId ?? invoice.id})`,
      },
    });

    await awardXp(
      invoice.studentId,
      awardedXp,
      "Mensalidade paga via Pix",
      "tuition",
      awardedCoins,
      settings
    );

    await logAuditEvent({
      schoolId: invoice.schoolId,
      actorId: "SYSTEM_GATEWAY",
      actorRole: "system",
      action: "PAYMENT_RECONCILED",
      entityType: "Invoice",
      entityId: invoice.id,
      diffAfter: { receiptCode: payment.receiptCode, amountCents: invoice.amountCents },
    });
  }

  return updatedInvoice;
}
