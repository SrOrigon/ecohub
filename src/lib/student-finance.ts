export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseReaisToCents(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace("R$", "").replace(/\./g, "").replace(",", ".");
  if (!normalized) return 0;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export type FinanceStatus = "not_configured" | "current" | "overdue" | "exempt";

export type FinanceSnapshot = {
  monthlyAmountCents: number;
  dueDay: number;
  discountPercent: number;
  expectedInstallments: number;
  paidCount: number;
  nextDueDate: string | null;
  status: FinanceStatus;
  statusLabel: string;
  netAmountCents: number;
  payments: FinancePaymentRecord[];
};

type FinancePaymentInput = {
  id: string;
  amountCents: number;
  paidAt: Date;
  dueDate: Date;
  receiptCode: string;
  awardedXp: number;
  awardedCoins: number;
  method: string;
};

export type FinancePaymentRecord = {
  id: string;
  amountCents: number;
  paidAt: string;
  dueDate: string;
  receiptCode: string;
  awardedXp: number;
  awardedCoins: number;
  method: string;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dueDateForMonth(year: number, month: number, dueDay: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(dueDay, lastDay));
}

export function buildFinanceSnapshot(input: {
  monthlyAmountCents: number;
  dueDay: number;
  discountPercent: number;
  expectedInstallments: number;
  payments: FinancePaymentInput[];
  now?: Date;
}): FinanceSnapshot {
  const now = input.now ?? new Date();
  const netAmountCents = Math.max(
    0,
    Math.round(input.monthlyAmountCents * (1 - Math.min(100, Math.max(0, input.discountPercent)) / 100))
  );

  if (input.monthlyAmountCents <= 0) {
    return {
      monthlyAmountCents: 0,
      dueDay: input.dueDay,
      discountPercent: input.discountPercent,
      expectedInstallments: input.expectedInstallments,
      paidCount: input.payments.length,
      nextDueDate: null,
      status: "not_configured",
      statusLabel: "Não configurado",
      netAmountCents: 0,
      payments: serializePayments(input.payments),
    };
  }

  const thisDue = dueDateForMonth(now.getFullYear(), now.getMonth(), input.dueDay);
  const paidThisPeriod = input.payments.some((payment) => {
    const paid = new Date(payment.paidAt);
    return paid.getFullYear() == now.getFullYear() && paid.getMonth() === now.getMonth();
  });

  let nextDue = thisDue;
  let status: FinanceStatus = "current";
  let statusLabel = "Em dia";

  if (paidThisPeriod) {
    nextDue = dueDateForMonth(now.getFullYear(), now.getMonth() + 1, input.dueDay);
  } else if (startOfDay(now) > startOfDay(thisDue)) {
    status = "overdue";
    statusLabel = "Pendência financeira";
  }

  return {
    monthlyAmountCents: input.monthlyAmountCents,
    dueDay: input.dueDay,
    discountPercent: input.discountPercent,
    expectedInstallments: input.expectedInstallments,
    paidCount: input.payments.length,
    nextDueDate: nextDue.toISOString(),
    status,
    statusLabel,
    netAmountCents,
    payments: serializePayments(input.payments),
  };
}

function serializePayments(payments: FinancePaymentInput[]): FinancePaymentRecord[] {
  return payments
    .slice()
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
    .map((payment) => ({
      id: payment.id,
      amountCents: payment.amountCents,
      paidAt: payment.paidAt.toISOString(),
      dueDate: payment.dueDate.toISOString(),
      receiptCode: payment.receiptCode,
      awardedXp: payment.awardedXp,
      awardedCoins: payment.awardedCoins,
      method: payment.method,
    }));
}

export function makeReceiptCode(enrollmentCode: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  return `ECO-${enrollmentCode}-${stamp}`.replace(/\s+/g, "");
}
