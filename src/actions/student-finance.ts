"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { awardXp } from "@/lib/gamification";
import { getSchoolSettingsForStudent } from "@/lib/school-settings";
import { makeReceiptCode, parseReaisToCents } from "@/lib/student-finance";
import { logAuditEvent } from "@/lib/audit-logger";
import { createPixInvoice } from "@/lib/payment-gateway";

function canWriteFinance(role: string) {
  return role === "admin" || role === "director" || role === "secretary";
}

export async function upsertStudentFinanceAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return { error: "Escola não configurada." };
  if (!canWriteFinance(user.role)) return { error: "Sem permissão financeira." };

  const studentId = String(formData.get("studentId") ?? "");
  const amountCents = parseReaisToCents(String(formData.get("monthlyAmount") ?? ""));
  const dueDay = Number(formData.get("dueDay") ?? 10);
  const discountPercent = Number(String(formData.get("discountPercent") ?? "0").replace(",", "."));
  const expectedInstallments = Number(formData.get("expectedInstallments") ?? 10);

  if (!studentId) return { error: "Aluno não informado." };
  if (amountCents == null) return { error: "Valor da mensalidade inválido." };
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
    return { error: "Dia de vencimento deve ser entre 1 e 28." };
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return { error: "Desconto deve ser entre 0 e 100%." };
  }
  if (!Number.isInteger(expectedInstallments) || expectedInstallments < 1 || expectedInstallments > 24) {
    return { error: "Quantidade de parcelas inválida." };
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: user.schoolId } },
    select: { id: true },
  });
  if (!student) return { error: "Aluno não encontrado." };

  await prisma.studentFinanceAccount.upsert({
    where: { studentId },
    create: {
      studentId,
      monthlyAmountCents: amountCents,
      dueDay,
      discountPercent,
      expectedInstallments,
    },
    update: {
      monthlyAmountCents: amountCents,
      dueDay,
      discountPercent,
      expectedInstallments,
    },
  });

  await logAuditEvent({
    schoolId: user.schoolId,
    actorId: user.id,
    actorRole: user.role,
    action: "FINANCE_ACCOUNT_UPDATE",
    entityType: "StudentFinanceAccount",
    entityId: studentId,
    diffAfter: { amountCents, dueDay, discountPercent, expectedInstallments },
  });

  revalidatePath(`/dashboard/alunos/${studentId}`);
  return { success: true };
}

export async function recordTuitionPaymentAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) return { error: "Aluno não informado." };

  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: user.schoolId } },
    select: { id: true, enrollmentCode: true, financeAccount: true },
  });
  if (!student) return { error: "Aluno não encontrado." };

  let account = student.financeAccount;
  if (!account) {
    account = await prisma.studentFinanceAccount.create({
      data: { studentId },
    });
  }

  if (account.monthlyAmountCents <= 0) {
    return { error: "Configure a mensalidade antes de registrar o pagamento." };
  }

  const net = Math.max(
    0,
    Math.round(account.monthlyAmountCents * (1 - account.discountPercent / 100))
  );
  const settings = await getSchoolSettingsForStudent(studentId);
  const awardedXp = settings.finance.tuitionXp;
  const awardedCoins = settings.finance.tuitionCoins;
  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(account.dueDay, 28));

  const payment = await prisma.tuitionPayment.create({
    data: {
      accountId: account.id,
      studentId,
      amountCents: net,
      dueDate,
      method: "manual",
      receiptCode: makeReceiptCode(student.enrollmentCode),
      awardedXp,
      awardedCoins,
      note: "Pagamento registrado pela instituição",
    },
  });

  await logAuditEvent({
    schoolId: user.schoolId,
    actorId: user.id,
    actorRole: user.role,
    action: "FINANCE_PAYMENT_RECORD",
    entityType: "TuitionPayment",
    entityId: payment.id,
    diffAfter: { studentId, netAmountCents: net, receiptCode: payment.receiptCode },
  });

  await awardXp(
    studentId,
    awardedXp,
    "Mensalidade paga",
    "tuition",
    awardedCoins,
    settings
  );

  revalidatePath(`/dashboard/alunos/${studentId}`);
  return { success: true, message: `Pagamento registrado. +${awardedXp} XP e +${awardedCoins} moedas na carteira.` };
}

export async function createStudentInvoiceAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "secretary", "parent", "student"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) return { error: "Aluno não informado." };

  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: user.schoolId } },
    select: { id: true, financeAccount: true },
  });
  if (!student) return { error: "Aluno não encontrado." };

  const amountCents = student.financeAccount?.monthlyAmountCents ?? 15000;
  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 10);

  const invoice = await createPixInvoice({
    schoolId: user.schoolId,
    studentId,
    amountCents,
    dueDate,
  });

  await logAuditEvent({
    schoolId: user.schoolId,
    actorId: user.id,
    actorRole: user.role,
    action: "INVOICE_CREATE_PIX",
    entityType: "Invoice",
    entityId: invoice.id,
    diffAfter: { studentId, amountCents, pixCopyPaste: invoice.pixCopyPaste },
  });

  revalidatePath(`/dashboard/alunos/${studentId}`);
  revalidatePath("/dashboard/responsavel");
  revalidatePath("/dashboard/aluno");

  return {
    success: true,
    invoice: {
      id: invoice.id,
      amountCents: invoice.amountCents,
      dueDate: invoice.dueDate.toISOString(),
      pixCopyPaste: invoice.pixCopyPaste,
      pixQrCode: invoice.pixQrCode,
      status: invoice.status,
    },
  };
}

export async function getStudentInvoicesAction(studentId: string) {
  const user = await requireSession(["admin", "director", "secretary", "parent", "student"]);
  if (!user.schoolId) return [];

  return prisma.invoice.findMany({
    where: { studentId, schoolId: user.schoolId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getOverdueFinanceAlertsAction(daysThreshold = 5) {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return [];

  const thresholdDate = new Date();
  daysThreshold = Math.max(1, daysThreshold);
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      schoolId: user.schoolId,
      status: { in: ["PENDING", "OVERDUE"] },
      dueDate: { lt: thresholdDate },
    },
    include: {
      student: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
          classGroup: { select: { name: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date().getTime();

  return overdueInvoices.map((inv) => {
    const dueTime = new Date(inv.dueDate).getTime();
    const daysOverdue = Math.floor((now - dueTime) / (1000 * 60 * 60 * 24));

    return {
      id: inv.id,
      studentId: inv.studentId,
      studentName: inv.student.user.fullName,
      studentClass: inv.student.classGroup?.name ?? "Sem turma",
      amountCents: inv.amountCents,
      dueDate: inv.dueDate.toISOString(),
      daysOverdue,
      status: inv.status,
    };
  });
}
