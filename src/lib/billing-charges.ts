import { prisma } from "@/lib/db";
import {
  type BillingCharge,
  type BillingFlag,
  chargeStanding,
  dueDateForMonth,
  formatDueDate,
  monthKey,
  netAmountCents,
  planStartMonth,
  referenceMonthLabel,
  standingLabel,
  summarizeCharges,
  takeChargePayment,
} from "@/lib/billing-status";

type InvoiceRow = {
  id: string;
  kind: "student" | "pix";
  studentId: string;
  title: string;
  amountCents: number;
  dueDate: Date;
  status: string;
  paidAt: Date | null;
  pixCopyPaste: string | null;
};

type PaymentRow = {
  id: string;
  amountCents: number;
  paidAt: Date;
  dueDate: Date;
  installmentId: string | null;
  receiptCode: string;
};

type InstallmentRow = {
  id: string;
  sequence: number;
  title: string;
  dueDate: Date;
  amountCents: number;
  paymentMethod: string | null;
};

export async function listBillingCharges(schoolId: string, studentId?: string) {
  const studentWhere = {
    user: { schoolId },
    ...(studentId ? { id: studentId } : {}),
  };

  const [students, studentInvoices, pixInvoices, logs] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        user: { select: { fullName: true, phone: true } },
        classGroup: { select: { name: true } },
        parentLinks: {
          select: { parent: { select: { fullName: true, phone: true } } },
          take: 4,
        },
        financeAccount: {
          select: {
            monthlyAmountCents: true,
            dueDay: true,
            firstDueDate: true,
            discountPercent: true,
            expectedInstallments: true,
            createdAt: true,
            payments: {
              select: {
                id: true,
                amountCents: true,
                paidAt: true,
                dueDate: true,
                installmentId: true,
                receiptCode: true,
              },
            },
            installments: {
              select: {
                id: true,
                sequence: true,
                title: true,
                dueDate: true,
                amountCents: true,
                paymentMethod: true,
              },
              orderBy: { sequence: "asc" },
            },
          },
        },
      },
      orderBy: { user: { fullName: "asc" } },
    }),
    prisma.studentInvoice.findMany({
      where: {
        schoolId,
        ...(studentId ? { studentId } : {}),
        status: { notIn: ["CANCELED", "REFUNDED"] },
      },
      select: {
        id: true,
        studentId: true,
        title: true,
        amountCents: true,
        dueDate: true,
        status: true,
        paidAt: true,
        pixCopyPaste: true,
      },
    }),
    prisma.invoice.findMany({
      where: {
        schoolId,
        ...(studentId ? { studentId } : {}),
        status: { not: "CANCELED" },
      },
      select: {
        id: true,
        studentId: true,
        amountCents: true,
        dueDate: true,
        status: true,
        paidAt: true,
        pixCopyPaste: true,
      },
    }),
    prisma.whatsAppBillingLog.findMany({
      where: { schoolId, status: "SENT" },
      orderBy: { createdAt: "desc" },
      take: 400,
      select: { invoiceId: true, createdAt: true },
    }),
  ]);

  const lastWhatsapp = new Map<string, string>();
  for (const log of logs) {
    if (!lastWhatsapp.has(log.invoiceId)) lastWhatsapp.set(log.invoiceId, log.createdAt.toISOString());
  }

  const invoicesByStudent = new Map<string, InvoiceRow[]>();
  for (const invoice of studentInvoices) {
    pushInvoice(invoicesByStudent, {
      id: invoice.id,
      kind: "student",
      studentId: invoice.studentId,
      title: invoice.title,
      amountCents: invoice.amountCents,
      dueDate: invoice.dueDate,
      status: invoice.status,
      paidAt: invoice.paidAt,
      pixCopyPaste: invoice.pixCopyPaste,
    });
  }
  for (const invoice of pixInvoices) {
    pushInvoice(invoicesByStudent, {
      id: invoice.id,
      kind: "pix",
      studentId: invoice.studentId,
      title: "Mensalidade",
      amountCents: invoice.amountCents,
      dueDate: invoice.dueDate,
      status: invoice.status,
      paidAt: invoice.paidAt,
      pixCopyPaste: invoice.pixCopyPaste,
    });
  }

  const now = new Date();
  const charges: BillingCharge[] = [];

  for (const student of students) {
    const contact = pickParent(student.parentLinks, student.user.phone, student.user.fullName);
    const invoices = invoicesByStudent.get(student.id) ?? [];
    const covered = new Set<string>();
    const account = student.financeAccount;

    if (account && account.installments.length > 0) {
      const usedPayments = new Set<string>();
      for (const installment of account.installments) {
        covered.add(monthKey(installment.dueDate));
        const payment = takeChargePayment(account.payments, installment, usedPayments);
        charges.push(
          chargeFromInstallment({
            installment,
            studentId: student.id,
            studentName: student.user.fullName,
            className: student.classGroup?.name ?? null,
            parentName: contact.name,
            parentPhone: contact.phone,
            payment,
            lastWhatsapp,
            now,
          })
        );
      }
    } else if (account && account.monthlyAmountCents > 0) {
      const count = Math.min(24, Math.max(1, account.expectedInstallments));
      const anchor = account.firstDueDate;
      const start = anchor
        ? new Date(anchor.getFullYear(), anchor.getMonth(), 1)
        : planStartMonth(account.createdAt, now);
      const dueDay = anchor ? anchor.getDate() : account.dueDay;
      const amount = netAmountCents(account.monthlyAmountCents, account.discountPercent);

      for (let index = 0; index < count; index += 1) {
        const due = dueDateForMonth(start.getFullYear(), start.getMonth() + index, dueDay);
        const key = monthKey(due);
        covered.add(key);
        const monthInvoices = invoices.filter((invoice) => monthKey(invoice.dueDate) === key);
        const payment = account.payments.find(
          (item) => monthKey(item.paidAt) === key || monthKey(item.dueDate) === key
        );
        charges.push(
          buildMonthCharge({
            studentId: student.id,
            studentName: student.user.fullName,
            className: student.classGroup?.name ?? null,
            parentName: contact.name,
            parentPhone: contact.phone,
            due,
            amountCents: amount,
            invoices: monthInvoices,
            payment: payment ?? null,
            lastWhatsapp,
            now,
            installment: index + 1,
          })
        );
      }
    }

    for (const invoice of invoices) {
      const key = monthKey(invoice.dueDate);
      if (covered.has(key)) continue;
      charges.push(
        chargeFromInvoice({
          invoice,
          studentName: student.user.fullName,
          className: student.classGroup?.name ?? null,
          parentName: contact.name,
          parentPhone: contact.phone,
          lastWhatsapp,
          now,
        })
      );
    }
  }

  charges.sort((a, b) => {
    const byName = a.studentName.localeCompare(b.studentName, "pt-BR");
    if (byName !== 0) return byName;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return charges;
}

export async function getBillingFlags(schoolId: string) {
  const charges = await listBillingCharges(schoolId);
  const grouped = new Map<string, BillingCharge[]>();
  for (const charge of charges) {
    const rows = grouped.get(charge.studentId) ?? [];
    rows.push(charge);
    grouped.set(charge.studentId, rows);
  }

  const flags: Record<string, BillingFlag> = {};
  for (const [id, rows] of grouped) {
    flags[id] = summarizeCharges(rows).state;
  }
  return flags;
}

function chargeFromInstallment(input: {
  installment: InstallmentRow;
  studentId: string;
  studentName: string;
  className: string | null;
  parentName: string | null;
  parentPhone: string | null;
  payment: PaymentRow | null;
  lastWhatsapp: Map<string, string>;
  now: Date;
}): BillingCharge {
  const paid = Boolean(input.payment);
  const standing = chargeStanding(input.installment.dueDate, paid, input.now);
  return {
    id: input.installment.id,
    kind: "plan",
    studentId: input.studentId,
    studentName: input.studentName,
    className: input.className,
    parentName: input.parentName,
    parentPhone: input.parentPhone,
    title: input.installment.title,
    amountCents: input.installment.amountCents,
    dueDate: input.installment.dueDate.toISOString(),
    paidAt: input.payment?.paidAt.toISOString() ?? null,
    standing,
    standingLabel: standingLabel(standing),
    paymentMethod: input.installment.paymentMethod,
    source: "installment",
    pixCopyPaste: null,
    lastWhatsappAt: input.lastWhatsapp.get(input.installment.id) ?? null,
    receiptCode: input.payment?.receiptCode ?? null,
  };
}

function pushInvoice(map: Map<string, InvoiceRow[]>, invoice: InvoiceRow) {
  const rows = map.get(invoice.studentId) ?? [];
  rows.push(invoice);
  map.set(invoice.studentId, rows);
}

function pickParent(
  links: Array<{ parent: { fullName: string; phone: string | null } }>,
  studentPhone: string | null,
  studentName: string
) {
  const withPhone = links.find((link) => link.parent.phone);
  if (withPhone) return { name: withPhone.parent.fullName, phone: withPhone.parent.phone };
  const first = links[0];
  if (first) return { name: first.parent.fullName, phone: first.parent.phone };
  return { name: studentName, phone: studentPhone };
}

function buildMonthCharge(input: {
  studentId: string;
  studentName: string;
  className: string | null;
  parentName: string | null;
  parentPhone: string | null;
  due: Date;
  amountCents: number;
  invoices: InvoiceRow[];
  payment: PaymentRow | null;
  lastWhatsapp: Map<string, string>;
  now: Date;
  installment: number;
}): BillingCharge {
  const paidInvoice = input.invoices.find((invoice) => invoice.status === "PAID" || invoice.paidAt);
  const openInvoice = input.invoices.find((invoice) => invoice.status !== "PAID" && !invoice.paidAt);
  const source = paidInvoice ?? openInvoice ?? null;
  const paid = Boolean(input.payment || paidInvoice);
  const standing = chargeStanding(input.due, paid, input.now);
  const id = source?.id ?? `plan:${input.studentId}:${monthKey(input.due)}`;
  const kind = source?.kind ?? "plan";

  return {
    id,
    kind,
    studentId: input.studentId,
    studentName: input.studentName,
    className: input.className,
    parentName: input.parentName,
    parentPhone: input.parentPhone,
    title: source?.title || `Mensalidade ${input.installment} · ${referenceMonthLabel(input.due)}`,
    amountCents: source?.amountCents ?? input.payment?.amountCents ?? input.amountCents,
    dueDate: input.due.toISOString(),
    paidAt: (paidInvoice?.paidAt ?? input.payment?.paidAt ?? null)?.toISOString() ?? null,
    standing,
    standingLabel: standingLabel(standing),
    paymentMethod: null,
    source: "plan",
    pixCopyPaste: source?.pixCopyPaste ?? null,
    lastWhatsappAt: input.lastWhatsapp.get(id) ?? null,
    receiptCode: input.payment?.receiptCode ?? null,
  };
}

function chargeFromInvoice(input: {
  invoice: InvoiceRow;
  studentName: string;
  className: string | null;
  parentName: string | null;
  parentPhone: string | null;
  lastWhatsapp: Map<string, string>;
  now: Date;
}): BillingCharge {
  const paid = input.invoice.status === "PAID" || Boolean(input.invoice.paidAt);
  const standing = chargeStanding(input.invoice.dueDate, paid, input.now);
  return {
    id: input.invoice.id,
    kind: input.invoice.kind,
    studentId: input.invoice.studentId,
    studentName: input.studentName,
    className: input.className,
    parentName: input.parentName,
    parentPhone: input.parentPhone,
    title: input.invoice.title || `Mensalidade · ${referenceMonthLabel(input.invoice.dueDate)}`,
    amountCents: input.invoice.amountCents,
    dueDate: input.invoice.dueDate.toISOString(),
    paidAt: input.invoice.paidAt?.toISOString() ?? null,
    standing,
    standingLabel: standingLabel(standing),
    paymentMethod: null,
    source: "invoice",
    pixCopyPaste: input.invoice.pixCopyPaste,
    lastWhatsappAt: input.lastWhatsapp.get(input.invoice.id) ?? null,
  };
}

export function formatChargeDue(iso: string) {
  return formatDueDate(new Date(iso));
}
