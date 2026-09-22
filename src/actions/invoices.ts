"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit-logger";
import { notifyUser } from "@/lib/notifications";
import { generatePixQrCodeDataUrl, generateSyntheticPixCopyPaste } from "@/lib/payment-gateway";
import { awardXp } from "@/lib/gamification";
import { getSchoolSettingsForStudent } from "@/lib/school-settings";
import { makeReceiptCode } from "@/lib/student-finance";

export async function createInvoiceAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const title = String(formData.get("title") ?? "").trim();
  const amountCents = Math.round(Number(formData.get("amountCents") ?? 0));
  const dueDateStr = String(formData.get("dueDate") ?? "");
  const targetStudentId = String(formData.get("studentId") ?? "").trim();
  const targetClassId = String(formData.get("classId") ?? "").trim();

  if (!title) return { error: "Título da fatura é obrigatório." };
  if (!amountCents || amountCents <= 0) return { error: "Valor da fatura é obrigatório." };
  if (!dueDateStr) return { error: "Data de vencimento é obrigatória." };

  const dueDate = new Date(dueDateStr);

  const schoolConfig = await prisma.schoolPaymentConfig.findUnique({
    where: { schoolId: user.schoolId },
  });

  let studentIds: string[] = [];

  if (targetStudentId) {
    studentIds = [targetStudentId];
  } else if (targetClassId) {
    const classStudents = await prisma.student.findMany({
      where: { classId: targetClassId, user: { schoolId: user.schoolId } },
      select: { id: true },
    });
    studentIds = classStudents.map((s) => s.id);
  } else {
    const allStudents = await prisma.student.findMany({
      where: { user: { schoolId: user.schoolId } },
      select: { id: true },
    });
    studentIds = allStudents.map((s) => s.id);
  }

  if (studentIds.length === 0) return { error: "Nenhum aluno encontrado para faturamento." };

  const createdInvoices = [];

  for (const studentId of studentIds) {
    const externalId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const pixCopy = schoolConfig?.pixKey
      ? `00020126580014BR.GOV.BCB.PIX0136${schoolConfig.pixKey}520400005303986540${(amountCents / 100).toFixed(2)}5802BR5915Ecohub6009Sao Paulo`
      : generateSyntheticPixCopyPaste(externalId, amountCents);
    const pixQrCodeBase64 = generatePixQrCodeDataUrl(pixCopy);

    const inv = await prisma.studentInvoice.create({
      data: {
        schoolId: user.schoolId,
        studentId,
        title,
        amountCents,
        dueDate,
        status: "PENDING",
        paymentMethodId: schoolConfig?.id ?? null,
        pixCopyPaste: pixCopy,
        pixQrCodeBase64,
        externalInvoiceId: externalId,
      },
    });
    createdInvoices.push(inv);
  }

  await logAuditEvent({
    schoolId: user.schoolId,
    actorId: user.id,
    actorRole: user.role,
    action: "STUDENT_INVOICE_CREATE_BULK",
    entityType: "StudentInvoice",
    diffAfter: { title, amountCents, totalCount: createdInvoices.length },
  });

  revalidatePath("/dashboard/secretaria");
  revalidatePath("/dashboard/alunos");

  return {
    success: true,
    message: `${createdInvoices.length} fatura(s) gerada(s) com sucesso.`,
  };
}

export async function uploadInvoiceProofAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "secretary", "parent", "student"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const proofUrl = String(formData.get("proofUrl") ?? "").trim();

  if (!invoiceId || !proofUrl) return { error: "Fatura ou comprovante inválidos." };

  const invoice = await prisma.studentInvoice.findFirst({
    where: { id: invoiceId, schoolId: user.schoolId },
    include: { student: { include: { user: { select: { fullName: true } } } } },
  });

  if (!invoice) return { error: "Fatura não encontrada." };

  await prisma.studentInvoice.update({
    where: { id: invoiceId },
    data: {
      proofAttachmentUrl: proofUrl,
      proofUploadedAt: new Date(),
      status: "AWAITING_CONFIRMATION",
    },
  });

  const directors = await prisma.user.findMany({
    where: { schoolId: user.schoolId, role: { in: ["director", "secretary", "admin"] } },
    select: { id: true },
  });

  for (const dir of directors) {
    await notifyUser(
      dir.id,
      "Novo comprovante anexado",
      `${invoice.student.user.fullName} anexou comprovante para "${invoice.title}".`,
      "/dashboard/secretaria"
    );
  }

  await logAuditEvent({
    schoolId: user.schoolId,
    actorId: user.id,
    actorRole: user.role,
    action: "INVOICE_PROOF_UPLOAD",
    entityType: "StudentInvoice",
    entityId: invoiceId,
    diffAfter: { proofUrl, status: "AWAITING_CONFIRMATION" },
  });

  revalidatePath("/dashboard/responsavel");
  revalidatePath("/dashboard/aluno");
  revalidatePath("/dashboard/secretaria");

  return { success: true, message: "Comprovante enviado! Aguardando confirmação da secretaria." };
}

export async function confirmInvoicePaymentAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const isApproved = String(formData.get("isApproved") ?? "true") === "true";
  const rejectReason = String(formData.get("rejectReason") ?? "").trim();

  if (!invoiceId) return { error: "Fatura inválida." };

  const invoice = await prisma.studentInvoice.findFirst({
    where: { id: invoiceId, schoolId: user.schoolId },
    include: {
      student: { select: { id: true, enrollmentCode: true, financeAccount: true, userId: true } },
    },
  });

  if (!invoice) return { error: "Fatura não encontrada." };

  if (isApproved) {
    const paidAt = new Date();
    await prisma.studentInvoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paidAt,
        verifiedByUserId: user.id,
      },
    });

    let account = invoice.student.financeAccount;
    if (!account) {
      account = await prisma.studentFinanceAccount.create({
        data: { studentId: invoice.studentId },
      });
    }

    const settings = await getSchoolSettingsForStudent(invoice.studentId);
    const awardedXp = settings.finance.tuitionXp;
    const awardedCoins = settings.finance.tuitionCoins;

    await prisma.tuitionPayment.create({
      data: {
        accountId: account.id,
        studentId: invoice.studentId,
        amountCents: invoice.amountCents,
        dueDate: invoice.dueDate,
        paidAt,
        method: "manual_proof_verified",
        receiptCode: makeReceiptCode(invoice.student.enrollmentCode),
        awardedXp,
        awardedCoins,
        note: `Comprovante aprovado por ${user.fullName}`,
      },
    });

    await awardXp(
      invoice.studentId,
      awardedXp,
      `Pagamento aprovado: ${invoice.title}`,
      "tuition",
      awardedCoins,
      settings
    );

    await notifyUser(
      invoice.student.userId,
      "Pagamento aprovado!",
      `Seu pagamento para "${invoice.title}" foi verificado e aprovado.`,
      "/dashboard/aluno"
    );

    await logAuditEvent({
      schoolId: user.schoolId,
      actorId: user.id,
      actorRole: user.role,
      action: "INVOICE_PAYMENT_CONFIRMED",
      entityType: "StudentInvoice",
      entityId: invoiceId,
      diffAfter: { status: "PAID", verifiedByUserId: user.id },
    });

    revalidatePath("/dashboard/secretaria");
    revalidatePath(`/dashboard/alunos/${invoice.studentId}`);

    return { success: true, message: "Pagamento aprovado com sucesso!" };
  } else {
    await prisma.studentInvoice.update({
      where: { id: invoiceId },
      data: {
        status: "PENDING",
        proofAttachmentUrl: null,
        proofUploadedAt: null,
      },
    });

    await notifyUser(
      invoice.student.userId,
      "Comprovante recusado",
      `O comprovante de "${invoice.title}" não pôde ser confirmado. Motivo: ${rejectReason || "Dados divergentes"}.`,
      "/dashboard/aluno"
    );

    await logAuditEvent({
      schoolId: user.schoolId,
      actorId: user.id,
      actorRole: user.role,
      action: "INVOICE_PAYMENT_REJECTED",
      entityType: "StudentInvoice",
      entityId: invoiceId,
      diffAfter: { status: "PENDING", rejectReason },
    });

    revalidatePath("/dashboard/secretaria");
    revalidatePath(`/dashboard/alunos/${invoice.studentId}`);

    return { success: true, message: "Comprovante recusado. A fatura retornou para o status pendente." };
  }
}

export async function logWhatsAppBillingSentAction(invoiceId: string) {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const invoice = await prisma.studentInvoice.findFirst({
    where: { id: invoiceId, schoolId: user.schoolId },
  });

  if (!invoice) return { error: "Fatura não encontrada." };

  await logAuditEvent({
    schoolId: user.schoolId,
    actorId: user.id,
    actorRole: user.role,
    action: "INVOICE_WHATSAPP_BILLING_SENT",
    entityType: "StudentInvoice",
    entityId: invoiceId,
    diffAfter: { invoiceTitle: invoice.title, amountCents: invoice.amountCents },
  });

  return { success: true };
}

export async function getAwaitingConfirmationInvoicesAction() {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return [];

  return prisma.studentInvoice.findMany({
    where: {
      schoolId: user.schoolId,
      status: "AWAITING_CONFIRMATION",
    },
    include: {
      student: {
        include: {
          user: { select: { fullName: true, email: true } },
          classGroup: { select: { name: true } },
          parentLinks: {
            include: {
              parent: { select: { id: true, fullName: true, phone: true } },
            },
          },
        },
      },
    },
    orderBy: { proofUploadedAt: "desc" },
  });
}

export async function getOverdueInvoicesAction() {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return [];

  const now = new Date();

  return prisma.studentInvoice.findMany({
    where: {
      schoolId: user.schoolId,
      OR: [
        { status: "OVERDUE" },
        { status: "PENDING", dueDate: { lt: now } },
      ],
    },
    include: {
      student: {
        include: {
          user: { select: { fullName: true, email: true } },
          classGroup: { select: { name: true } },
          parentLinks: {
            include: {
              parent: { select: { id: true, fullName: true, phone: true } },
            },
          },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });
}
