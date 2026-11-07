"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { awardXp } from "@/lib/gamification";
import { getSchoolSettingsForStudent } from "@/lib/school-settings";
import { monthKey } from "@/lib/billing-status";
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
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/dashboard/alunos");
  revalidatePath("/dashboard/responsavel");
  return { success: true };
}

export async function applyClassTuitionPlanAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return { error: "Escola não configurada." };
  if (!canWriteFinance(user.role)) return { error: "Sem permissão financeira." };

  const classId = String(formData.get("classId") ?? "");
  const amountCents = parseReaisToCents(String(formData.get("monthlyAmount") ?? ""));
  const dueDay = Number(formData.get("dueDay") ?? 10);
  const discountPercent = Number(String(formData.get("discountPercent") ?? "0").replace(",", "."));
  const expectedInstallments = Number(formData.get("expectedInstallments") ?? 10);

  if (!classId) return { error: "Escolha a turma." };
  if (amountCents == null || amountCents <= 0) {
    return { error: "Informe o valor da mensalidade que a instituição cobra." };
  }
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
    return { error: "Dia de vencimento deve ser entre 1 e 28." };
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return { error: "Desconto deve ser entre 0 e 100%." };
  }
  if (!Number.isInteger(expectedInstallments) || expectedInstallments < 1 || expectedInstallments > 24) {
    return { error: "Quantidade de parcelas inválida." };
  }

  const classGroup = await prisma.classGroup.findFirst({
    where: { id: classId, schoolId: user.schoolId },
    select: { id: true, name: true, students: { select: { id: true } } },
  });
  if (!classGroup) return { error: "Turma não encontrada." };
  if (classGroup.students.length === 0) return { error: "Essa turma não tem alunos." };

  await prisma.$transaction(
    classGroup.students.map((student) =>
      prisma.studentFinanceAccount.upsert({
        where: { studentId: student.id },
        create: {
          studentId: student.id,
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
      })
    )
  );

  await logAuditEvent({
    schoolId: user.schoolId,
    actorId: user.id,
    actorRole: user.role,
    action: "FINANCE_ACCOUNT_UPDATE",
    entityType: "ClassGroup",
    entityId: classGroup.id,
    diffAfter: {
      className: classGroup.name,
      students: classGroup.students.length,
      amountCents,
      dueDay,
      discountPercent,
      expectedInstallments,
    },
  });

  revalidatePath("/dashboard/financeiro");
  revalidatePath("/dashboard/alunos");
  revalidatePath("/dashboard/responsavel");
  for (const student of classGroup.students) {
    revalidatePath(`/dashboard/alunos/${student.id}`);
  }

  return {
    success: true,
    message: `Mensalidade aplicada a ${classGroup.students.length} aluno(s) de ${classGroup.name}.`,
  };
}

export async function saveStudentInstallmentsAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return { error: "Escola não configurada." };
  if (!canWriteFinance(user.role)) return { error: "Sem permissão financeira." };

  const studentId = String(formData.get("studentId") ?? "");
  const ids = formData.getAll("rowId").map(String);
  const titles = formData.getAll("rowTitle").map(String);
  const dues = formData.getAll("rowDue").map(String);
  const amounts = formData.getAll("rowAmount").map(String);
  const methods = formData.getAll("rowMethod").map(String);
  const removes = formData.getAll("rowRemove").map(String);
  if (!studentId) return { error: "Aluno não informado." };
  if (ids.length === 0) return { error: "Inclua ao menos uma parcela." };
  if (new Set([ids.length, titles.length, dues.length, amounts.length, methods.length, removes.length]).size !== 1) {
    return { error: "Não foi possível ler as parcelas." };
  }
  if (ids.filter((_, index) => removes[index] !== "1").length > 36) {
    return { error: "O limite é de 36 parcelas por aluno." };
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: user.schoolId } },
    select: { id: true, financeAccount: true },
  });
  if (!student) return { error: "Aluno não encontrado." };

  const account =
    student.financeAccount ??
    (await prisma.studentFinanceAccount.create({
      data: { studentId },
    }));

  const [existing, payments] = await Promise.all([
    prisma.tuitionInstallment.findMany({ where: { accountId: account.id } }),
    prisma.tuitionPayment.findMany({
      where: { studentId },
      select: { id: true, installmentId: true, dueDate: true },
    }),
  ]);
  const byId = new Map(existing.map((item) => [item.id, item]));
  const paidIds = new Set(payments.flatMap((item) => (item.installmentId ? [item.installmentId] : [])));

  type Plan =
    | { op: "delete"; id: string }
    | { op: "keep"; id: string; sequence: number }
    | {
        op: "update";
        id: string;
        sequence: number;
        title: string;
        dueDate: Date;
        amountCents: number;
        paymentMethod: string | null;
      }
    | {
        op: "create";
        sequence: number;
        title: string;
        dueDate: Date;
        amountCents: number;
        paymentMethod: string | null;
      };

  const plans: Plan[] = [];
  let sequence = 0;
  for (let index = 0; index < ids.length; index += 1) {
    const current = ids[index] ? byId.get(ids[index]) : undefined;
    const paid = current
      ? paidIds.has(current.id) ||
        payments.some(
          (item) => !item.installmentId && monthKey(item.dueDate) === monthKey(current.dueDate)
        )
      : false;
    if (removes[index] === "1") {
      if (current && !paid) plans.push({ op: "delete", id: current.id });
      else if (current && paid) {
        sequence += 1;
        plans.push({ op: "keep", id: current.id, sequence });
      }
      continue;
    }

    const title = titles[index].trim().slice(0, 80) || "Mensalidade";
    const dueDate = parseInstallmentDueDate(dues[index].trim(), new Date(), account.dueDay);
    if (!dues[index].trim() || !dueDate) return { error: "Informe a data de vencimento de cada parcela." };
    if (!amounts[index].trim()) return { error: "Informe o valor de cada parcela." };
    const amountCents = parseReaisToCents(amounts[index]);
    if (amountCents == null) return { error: "Há um valor de parcela inválido." };
    const paymentMethod = methods[index].trim().slice(0, 60) || null;
    sequence += 1;

    if (current && paid) {
      plans.push({ op: "keep", id: current.id, sequence });
      continue;
    }
    if (current) {
      plans.push({ op: "update", id: current.id, sequence, title, dueDate, amountCents, paymentMethod });
      continue;
    }
    plans.push({ op: "create", sequence, title, dueDate, amountCents, paymentMethod });
  }

  if (!plans.some((item) => item.op !== "delete")) return { error: "Inclua ao menos uma parcela." };

  await prisma.$transaction(async (tx) => {
    for (const item of existing) {
      await tx.tuitionInstallment.update({
        where: { id: item.id },
        data: { sequence: item.sequence + 1000 },
      });
    }
    for (const plan of plans) {
      if (plan.op === "delete") {
        await tx.tuitionInstallment.delete({ where: { id: plan.id } });
        continue;
      }
      if (plan.op === "keep") {
        await tx.tuitionInstallment.update({ where: { id: plan.id }, data: { sequence: plan.sequence } });
        continue;
      }
      if (plan.op === "update") {
        await tx.tuitionInstallment.update({
          where: { id: plan.id },
          data: {
            sequence: plan.sequence,
            title: plan.title,
            dueDate: plan.dueDate,
            amountCents: plan.amountCents,
            paymentMethod: plan.paymentMethod,
          },
        });
        continue;
      }
      await tx.tuitionInstallment.create({
        data: {
          accountId: account.id,
          studentId,
          sequence: plan.sequence,
          title: plan.title,
          dueDate: plan.dueDate,
          amountCents: plan.amountCents,
          paymentMethod: plan.paymentMethod,
        },
      });
    }

    const stored = await tx.tuitionInstallment.findMany({ where: { accountId: account.id } });
    const linked = new Set(stored.map((item) => item.id));
    for (const payment of payments) {
      if (payment.installmentId && linked.has(payment.installmentId)) continue;
      const match = stored.find((item) => monthKey(item.dueDate) === monthKey(payment.dueDate));
      if (!match) continue;
      const taken = payments.some((item) => item.installmentId === match.id);
      if (taken) continue;
      await tx.tuitionPayment.update({ where: { id: payment.id }, data: { installmentId: match.id } });
      payment.installmentId = match.id;
    }
  });

  revalidatePath(`/dashboard/alunos/${studentId}`);
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/dashboard/alunos");
  revalidatePath("/dashboard/responsavel");
  return { success: true, message: "Parcelas salvas." };
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

  const dueValues = formData.getAll("dueDate").map((value) => String(value));
  const installmentIds = formData.getAll("installmentId").map((value) => String(value));
  if (account.monthlyAmountCents <= 0 && installmentIds.every((id) => !id)) {
    return { error: "A instituição ainda não definiu a mensalidade deste aluno." };
  }

  const net = Math.max(
    0,
    Math.round(account.monthlyAmountCents * (1 - account.discountPercent / 100))
  );
  const settings = await getSchoolSettingsForStudent(studentId);
  const awardedXp = settings.finance.tuitionXp;
  const awardedCoins = settings.finance.tuitionCoins;
  const now = new Date();
  const targetCount = Math.max(dueValues.length, installmentIds.length);
  const targets = targetCount > 0 ? Array.from({ length: targetCount }, (_, index) => index) : [0];
  let settled = 0;
  let lastReceipt = "";

  for (const index of targets) {
    const dueRaw = dueValues[index] ?? "";
    const installmentId = installmentIds[index] ?? "";
    const installment = installmentId
      ? await prisma.tuitionInstallment.findFirst({
          where: { id: installmentId, studentId, accountId: account.id },
        })
      : null;
    const dueDate = installment?.dueDate ?? parseInstallmentDueDate(dueRaw, now, account.dueDay);
    if (!dueDate) return { error: "Data da parcela inválida." };

    const monthStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
    const monthEnd = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 1);
    const alreadyPaid = await prisma.tuitionPayment.findFirst({
      where: installment
        ? { studentId, installmentId: installment.id }
        : {
            studentId,
            OR: [
              { dueDate: { gte: monthStart, lt: monthEnd } },
              { paidAt: { gte: monthStart, lt: monthEnd } },
            ],
          },
      select: { id: true },
    });
    if (alreadyPaid) {
      if (targets.length === 1) return { error: "Essa parcela já está quitada." };
      continue;
    }

    const payment = await prisma.tuitionPayment.create({
      data: {
        accountId: account.id,
        studentId,
        installmentId: installment?.id,
        amountCents: installment?.amountCents ?? net,
        dueDate,
        paidAt: installment ? now : dueRaw ? dueDate : now,
        method: installment?.paymentMethod || "manual",
        receiptCode: makeReceiptCode(student.enrollmentCode),
        awardedXp,
        awardedCoins,
        note: "Pagamento registrado pela instituição",
      },
    });
    lastReceipt = payment.receiptCode;
    settled += 1;

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
  }

  if (settled === 0) return { error: "Nenhuma parcela em aberto para quitar." };

  revalidatePath(`/dashboard/alunos/${studentId}`);
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/dashboard/alunos");
  revalidatePath("/dashboard/responsavel");
  const reward = `+${awardedXp * settled} XP e +${awardedCoins * settled} moedas na carteira.`;
  return {
    success: true,
    message:
      settled === 1
        ? `Parcela quitada. ${reward}`
        : `${settled} parcelas quitadas. ${reward}`,
    receiptCode: lastReceipt,
  };
}

function parseInstallmentDueDate(raw: string, now: Date, dueDay: number) {
  if (!raw) return new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, 28));
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
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

  const account = student.financeAccount;
  if (!account || account.monthlyAmountCents <= 0) {
    return { error: "A instituição ainda não definiu a mensalidade deste aluno." };
  }
  const amountCents = Math.max(
    0,
    Math.round(account.monthlyAmountCents * (1 - Math.min(100, Math.max(0, account.discountPercent)) / 100))
  );
  if (amountCents <= 0) {
    return { error: "O valor definido pela instituição ficou zerado depois do desconto." };
  }
  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(Math.max(account.dueDay, 1), 28));

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
