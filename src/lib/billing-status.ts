export type ChargeStanding = "paid" | "overdue" | "due" | "upcoming";
export type BillingFlag = "pending" | "clear" | "none";

export type BillingCharge = {
  id: string;
  kind: "student" | "pix" | "plan";
  studentId: string;
  studentName: string;
  className: string | null;
  parentName: string | null;
  parentPhone: string | null;
  title: string;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  standing: ChargeStanding;
  standingLabel: string;
  paymentMethod: string | null;
  source: "installment" | "plan" | "invoice";
  pixCopyPaste: string | null;
  lastWhatsappAt: string | null;
  receiptCode?: string | null;
};

export type BillingSummary = {
  state: BillingFlag;
  label: string;
  pendingCount: number;
  overdueCount: number;
  dueTodayCount: number;
  pendingAmountCents: number;
  paidCount: number;
  unpaidCount: number;
  total: number;
};

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dueDateForMonth(year: number, month: number, dueDay: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Math.max(dueDay, 1), lastDay));
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDueDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function referenceMonthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function chargeStanding(due: Date, paid: boolean, now = new Date()): ChargeStanding {
  if (paid) return "paid";
  const dueDay = startOfDay(due).getTime();
  const today = startOfDay(now).getTime();
  if (dueDay < today) return "overdue";
  if (dueDay === today) return "due";
  return "upcoming";
}

export function standingLabel(standing: ChargeStanding) {
  if (standing === "paid") return "Quitado";
  if (standing === "overdue") return "Pendente";
  if (standing === "due") return "Vence hoje";
  return "A vencer";
}

export function isOpenStanding(standing: ChargeStanding) {
  return standing === "overdue" || standing === "due";
}

export function summarizeCharges(charges: BillingCharge[]): BillingSummary {
  const overdueCount = charges.filter((charge) => charge.standing === "overdue").length;
  const dueTodayCount = charges.filter((charge) => charge.standing === "due").length;
  const pendingCount = overdueCount + dueTodayCount;
  const paidCount = charges.filter((charge) => charge.standing === "paid").length;
  const unpaidCount = charges.length - paidCount;
  const pendingAmountCents = charges
    .filter((charge) => isOpenStanding(charge.standing))
    .reduce((sum, charge) => sum + charge.amountCents, 0);
  const state: BillingFlag =
    charges.length === 0 ? "none" : pendingCount > 0 ? "pending" : "clear";

  return {
    state,
    label:
      state === "none"
        ? "Sem lançamentos"
        : state === "pending"
          ? "Há pendências a pagar"
          : "Sem pendências",
    pendingCount,
    overdueCount,
    dueTodayCount,
    pendingAmountCents,
    paidCount,
    unpaidCount,
    total: charges.length,
  };
}

export function planStartMonth(createdAt: Date, now = new Date()) {
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const created = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);
  return created > yearStart ? created : yearStart;
}

export function netAmountCents(monthlyAmountCents: number, discountPercent: number) {
  const discount = Math.min(100, Math.max(0, discountPercent));
  return Math.max(0, Math.round(monthlyAmountCents * (1 - discount / 100)));
}

export function isInsideRemindWindow(due: Date, remindDaysBefore: number, now = new Date()) {
  const limit = startOfDay(now);
  limit.setDate(limit.getDate() + Math.max(0, remindDaysBefore));
  return startOfDay(due).getTime() <= limit.getTime();
}

export function daysPastDue(due: Date, now = new Date()) {
  const diff = startOfDay(now).getTime() - startOfDay(due).getTime();
  return Math.max(0, Math.round(diff / 86_400_000));
}

type ChargePayment = {
  id: string;
  installmentId: string | null;
  dueDate: Date;
  paidAt: Date;
};

export function takeChargePayment<T extends ChargePayment>(
  payments: T[],
  installment: { id: string; dueDate: Date },
  used: Set<string>
) {
  const linked = payments.find((item) => item.installmentId === installment.id && !used.has(item.id));
  if (linked) {
    used.add(linked.id);
    return linked;
  }
  const key = monthKey(installment.dueDate);
  const byMonth = payments.find(
    (item) => !item.installmentId && !used.has(item.id) && (monthKey(item.dueDate) === key || monthKey(item.paidAt) === key)
  );
  if (byMonth) used.add(byMonth.id);
  return byMonth ?? null;
}
