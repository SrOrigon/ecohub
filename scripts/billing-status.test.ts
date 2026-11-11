import assert from "node:assert/strict";
import test from "node:test";
import {
  chargeStanding,
  daysPastDue,
  isInsideRemindWindow,
  netAmountCents,
  summarizeCharges,
  takeChargePayment,
  type BillingCharge,
} from "../src/lib/billing-status";

function charge(partial: Partial<BillingCharge> & Pick<BillingCharge, "standing" | "amountCents">): BillingCharge {
  return {
    id: partial.id ?? "c1",
    kind: "plan",
    studentId: "s1",
    studentName: "Aluno",
    className: null,
    parentName: null,
    parentPhone: null,
    title: "Parcela",
    dueDate: "2026-03-10T00:00:00.000Z",
    paidAt: null,
    standingLabel: "",
    paymentMethod: null,
    source: "installment",
    pixCopyPaste: null,
    lastWhatsappAt: null,
    ...partial,
  };
}

test("situação da parcela usa o dia, sem marcar pago duas vezes", () => {
  const due = new Date(2026, 2, 10);
  assert.equal(chargeStanding(due, true, new Date(2026, 2, 20)), "paid");
  assert.equal(chargeStanding(due, false, new Date(2026, 2, 9)), "upcoming");
  assert.equal(chargeStanding(due, false, new Date(2026, 2, 10, 18)), "due");
  assert.equal(chargeStanding(due, false, new Date(2026, 2, 11)), "overdue");
  assert.equal(daysPastDue(due, new Date(2026, 2, 13)), 3);
  assert.equal(daysPastDue(due, new Date(2026, 2, 10)), 0);
});

test("valor líquido aplica a bolsa e não fica negativo", () => {
  assert.equal(netAmountCents(10000, 10), 9000);
  assert.equal(netAmountCents(10000, 100), 0);
  assert.equal(netAmountCents(10000, -5), 10000);
});

test("resumo separa atraso de parcelas a vencer", () => {
  const summary = summarizeCharges([
    charge({ id: "atrasada", standing: "overdue", amountCents: 15000 }),
    charge({ id: "hoje", standing: "due", amountCents: 5000 }),
    charge({ id: "futura", standing: "upcoming", amountCents: 15000 }),
    charge({ id: "paga", standing: "paid", amountCents: 15000 }),
  ]);
  assert.equal(summary.pendingCount, 2);
  assert.equal(summary.pendingAmountCents, 20000);
  assert.equal(summary.paidCount, 1);
  assert.equal(summary.state, "pending");
  assert.equal(summarizeCharges([]).state, "none");
});

test("lembrete inclui o vencimento de hoje e o prazo configurado", () => {
  const now = new Date(2026, 2, 10, 9);
  assert.equal(isInsideRemindWindow(new Date(2026, 2, 13), 3, now), true);
  assert.equal(isInsideRemindWindow(new Date(2026, 2, 14), 3, now), false);
  assert.equal(isInsideRemindWindow(new Date(2026, 2, 1), 3, now), true);
});

test("pagamento vinculado à parcela não quita outra do mesmo mês", () => {
  const march = new Date(2026, 2, 10);
  const april = new Date(2026, 3, 10);
  const payments = [
    { id: "p1", installmentId: "parcela-1", dueDate: march, paidAt: march },
    { id: "p2", installmentId: null, dueDate: april, paidAt: april },
  ];
  const used = new Set<string>();
  const first = takeChargePayment(payments, { id: "parcela-1", dueDate: march }, used);
  const second = takeChargePayment(payments, { id: "parcela-2", dueDate: march }, used);
  const third = takeChargePayment(payments, { id: "parcela-3", dueDate: april }, used);
  assert.equal(first?.id, "p1");
  assert.equal(second, null);
  assert.equal(third?.id, "p2");
});
