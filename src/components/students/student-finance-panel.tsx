"use client";

import { useActionState } from "react";
import { recordTuitionPaymentAction, upsertStudentFinanceAction } from "@/actions/student-finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { formatBRL, type FinanceSnapshot } from "@/lib/student-finance";
import { formatDate } from "@/lib/utils";

export function StudentFinancePanel({
  studentId,
  finance,
  canWrite,
}: {
  studentId: string;
  finance: FinanceSnapshot;
  canWrite: boolean;
}) {
  const [planState, planAction, planPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) =>
      upsertStudentFinanceAction(formData),
    null
  );
  const [payState, payAction, payPending] = useActionState(
    async (_prev: { error?: string; success?: boolean; message?: string } | null, formData: FormData) =>
      recordTuitionPaymentAction(formData),
    null
  );

  const monthlyDefault = (finance.monthlyAmountCents / 100).toFixed(2).replace(".", ",");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Mensalidade" value={finance.netAmountCents > 0 ? formatBRL(finance.netAmountCents) : "—"} />
        <Stat
          label="Próximo vencimento"
          value={finance.nextDueDate ? formatDate(finance.nextDueDate) : "—"}
        />
        <Stat
          label="Status"
          value={finance.statusLabel}
          tone={finance.status === "overdue" ? "warn" : finance.status === "current" ? "ok" : "muted"}
        />
        <Stat
          label="Pagamentos"
          value={`${finance.paidCount}/${finance.expectedInstallments}`}
        />
      </div>

      {finance.status === "overdue" && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Há uma pendência financeira. Isso fica separado da gamificação  -  o aluno não perde XP nem moedas por atraso.
        </p>
      )}

      {canWrite && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form action={planAction} className="space-y-3 rounded-xl border border-slate-100 p-4">
            <input type="hidden" name="studentId" value={studentId} />
            <p className="font-medium text-slate-800">Plano de mensalidade</p>
            <div>
              <Label htmlFor="monthlyAmount">Valor mensal (R$)</Label>
              <Input id="monthlyAmount" name="monthlyAmount" defaultValue={monthlyDefault} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="dueDay">Vencimento (dia)</Label>
                <Input id="dueDay" name="dueDay" type="number" min={1} max={28} defaultValue={finance.dueDay} />
              </div>
              <div>
                <Label htmlFor="discountPercent">Desconto %</Label>
                <Input id="discountPercent" name="discountPercent" defaultValue={String(finance.discountPercent)} />
              </div>
            </div>
            <div>
              <Label htmlFor="expectedInstallments">Parcelas do ano</Label>
              <Input
                id="expectedInstallments"
                name="expectedInstallments"
                type="number"
                min={1}
                max={24}
                defaultValue={finance.expectedInstallments}
              />
            </div>
            {planState?.error && <p className="text-sm text-red-600">{planState.error}</p>}
            {planState?.success && <p className="text-sm text-emerald-600">Plano salvo.</p>}
            <Button type="submit" disabled={planPending} size="sm">
              {planPending ? "Salvando..." : "Salvar plano"}
            </Button>
          </form>

          <form action={payAction} className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
            <input type="hidden" name="studentId" value={studentId} />
            <p className="font-medium text-slate-800">Registrar pagamento</p>
            <p className="text-sm text-slate-600">
              Ao quitar a mensalidade, o aluno recebe XP e moedas na carteira. O atraso nunca remove gamificação.
            </p>
            {payState?.error && <p className="text-sm text-red-600">{payState.error}</p>}
            {payState?.success && payState.message && (
              <p className="text-sm text-emerald-700">{payState.message}</p>
            )}
            <Button type="submit" disabled={payPending || finance.monthlyAmountCents <= 0}>
              {payPending ? "Registrando..." : "Confirmar pagamento do mês"}
            </Button>
          </form>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Recibos</h3>
        {finance.payments.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum pagamento registrado.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {finance.payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2">
                <div>
                  <p className="font-mono text-xs text-slate-500">{payment.receiptCode}</p>
                  <p>{formatDate(payment.paidAt)} · {formatBRL(payment.amountCents)}</p>
                </div>
                <p className="text-xs text-emerald-700">
                  +{payment.awardedXp} XP · +{payment.awardedCoins} moedas
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "muted";
}) {
  const color =
    tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
