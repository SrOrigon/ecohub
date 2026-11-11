import Link from "next/link";
import { Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/student-finance";
import { receiptHref } from "@/lib/receipt-href";
import { formatDueDate, summarizeCharges, type BillingCharge, type ChargeStanding } from "@/lib/billing-status";

const STANDING_BADGE: Record<ChargeStanding, { label: string; variant: "success" | "danger" | "warning" | "secondary" }> = {
  paid: { label: "Paga", variant: "success" },
  overdue: { label: "Em atraso", variant: "danger" },
  due: { label: "Vence hoje", variant: "warning" },
  upcoming: { label: "A vencer", variant: "secondary" },
};

export type SchoolPaymentInstructions = {
  beneficiaryName: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
  bankName: string | null;
  instructions: string | null;
};

export function ParentFinanceCard({
  charges,
  payment,
}: {
  charges: BillingCharge[];
  payment: SchoolPaymentInstructions | null;
}) {
  const summary = summarizeCharges(charges);
  const next = charges.find((charge) => charge.standing !== "paid");
  const hasInstructions = Boolean(
    payment && (payment.pixKey || payment.bankName || payment.instructions)
  );

  return (
    <Card id="financeiro">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          Mensalidades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {charges.length === 0 ? (
          <p className="text-sm text-slate-500">A escola ainda não lançou mensalidades para este aluno.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Em aberto até hoje</p>
                <p className={`text-xl font-bold tabular-nums ${summary.pendingAmountCents > 0 ? "text-red-700" : "text-emerald-700"}`}>
                  {formatBRL(summary.pendingAmountCents)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Próximo vencimento</p>
                <p className="text-xl font-bold tabular-nums">
                  {next ? formatDueDate(new Date(next.dueDate)) : "—"}
                </p>
                {next && <p className="text-xs text-slate-500">{formatBRL(next.amountCents)}</p>}
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Parcelas pagas</p>
                <p className="text-xl font-bold tabular-nums">
                  {summary.paidCount} de {summary.total}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="px-2 py-2">Parcela</th>
                    <th className="px-2 py-2">Vencimento</th>
                    <th className="px-2 py-2">Valor</th>
                    <th className="px-2 py-2">Situação</th>
                    <th className="px-2 py-2">Pago em</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {charges.map((charge) => {
                    const badge = STANDING_BADGE[charge.standing];
                    return (
                      <tr key={charge.id} className="border-b border-slate-100">
                        <td className="px-2 py-2">{charge.title}</td>
                        <td className="whitespace-nowrap px-2 py-2">{formatDueDate(new Date(charge.dueDate))}</td>
                        <td className="whitespace-nowrap px-2 py-2 tabular-nums">{formatBRL(charge.amountCents)}</td>
                        <td className="px-2 py-2">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2">
                          {charge.paidAt ? formatDueDate(new Date(charge.paidAt)) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {charge.receiptCode && (
                            <Link href={receiptHref(charge.receiptCode)} className="text-sm font-medium text-indigo-700 hover:underline">
                              Recibo
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {hasInstructions && payment && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
            <p className="font-semibold text-emerald-900">Como pagar</p>
            <dl className="mt-2 space-y-1 text-slate-700">
              {payment.beneficiaryName && (
                <div>
                  <dt className="inline font-medium">Favorecido: </dt>
                  <dd className="inline">{payment.beneficiaryName}</dd>
                </div>
              )}
              {payment.pixKey && (
                <div>
                  <dt className="inline font-medium">Chave Pix{payment.pixKeyType ? ` (${payment.pixKeyType})` : ""}: </dt>
                  <dd className="inline select-all break-all font-mono">{payment.pixKey}</dd>
                </div>
              )}
              {payment.bankName && (
                <div>
                  <dt className="inline font-medium">Banco: </dt>
                  <dd className="inline">{payment.bankName}</dd>
                </div>
              )}
            </dl>
            {payment.instructions && <p className="mt-2 whitespace-pre-line text-slate-700">{payment.instructions}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
