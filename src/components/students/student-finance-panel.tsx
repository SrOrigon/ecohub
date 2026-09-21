"use client";

import { useActionState, useState } from "react";
import { createStudentInvoiceAction, recordTuitionPaymentAction, upsertStudentFinanceAction } from "@/actions/student-finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { formatBRL, type FinanceSnapshot, type FinancePaymentRecord } from "@/lib/student-finance";
import { formatDate } from "@/lib/utils";
import { Check, Copy, Download, QrCode } from "lucide-react";

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

  const [createdInvoice, setCreatedInvoice] = useState<{
    amountCents: number;
    pixCopyPaste: string;
    pixQrCode: string;
  } | null>(null);
  const [copied, setCopyState] = useState(false);
  const [generatingPix, setGeneratingPix] = useState(false);

  const monthlyDefault = (finance.monthlyAmountCents / 100).toFixed(2).replace(".", ",");

  async function handleGeneratePix() {
    setGeneratingPix(true);
    try {
      const formData = new FormData();
      formData.set("studentId", studentId);
      const res = await createStudentInvoiceAction(formData);
      if (res.success && res.invoice) {
        setCreatedInvoice({
          amountCents: res.invoice.amountCents,
          pixCopyPaste: res.invoice.pixCopyPaste ?? "",
          pixQrCode: res.invoice.pixQrCode ?? "",
        });
      }
    } finally {
      setGeneratingPix(false);
    }
  }

  function copyPix() {
    if (!createdInvoice) return;
    navigator.clipboard.writeText(createdInvoice.pixCopyPaste);
    setCopyState(true);
    setTimeout(() => setCopyState(false), 2000);
  }

  function downloadReceiptPdf(payment: FinancePaymentRecord) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante de Pagamento - ${payment.receiptCode}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #0f172a; max-width: 600px; margin: 0 auto; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
            .receipt-id { font-family: monospace; font-size: 14px; color: #64748b; }
            .amount { font-size: 28px; font-weight: bold; color: #047857; margin: 16px 0; }
            .details { background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 24px; }
            .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Ecohub - Comprovante Oficial de Quitação</h2>
            <p class="receipt-id">Recibo: ${payment.receiptCode}</p>
          </div>
          <div class="amount">${formatBRL(payment.amountCents)}</div>
          <div class="details">
            <p><strong>Data de Pagamento:</strong> ${formatDate(payment.paidAt)}</p>
            <p><strong>Vencimento Original:</strong> ${formatDate(payment.dueDate)}</p>
            <p><strong>Forma de Pagamento:</strong> ${payment.method === "pix_gateway" ? "Pix Dinâmico" : "Presencial / Manual"}</p>
            <p><strong>Recompensa de Gamificação:</strong> +${payment.awardedXp} XP · +${payment.awardedCoins} moedas</p>
          </div>
          <p style="color: #047857; font-weight: bold;">✔ MENSALIDADE QUITADA E CONCILIADA</p>
          <div class="footer">Autenticado digitalmente pela plataforma Ecohub SaaS.</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

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

      {/* Seção de Regularização Pix */}
      <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-900">Regularização Financeira via Pix</h4>
            <p className="text-xs text-slate-600">Gere um QR Code ou código copia e cola para pagamento instantâneo com baixa automática.</p>
          </div>
          <Button type="button" size="sm" onClick={handleGeneratePix} disabled={generatingPix}>
            <QrCode className="h-4 w-4 mr-1.5" />
            {generatingPix ? "Gerando..." : "Gerar Pix"}
          </Button>
        </div>

        {createdInvoice && (
          <div className="mt-3 flex flex-col gap-3 rounded-lg bg-white p-3 border border-sky-200 sm:flex-row sm:items-center">
            {createdInvoice.pixQrCode && (
              <img
                src={createdInvoice.pixQrCode}
                alt="QR Code Pix"
                className="h-28 w-28 rounded-lg border border-slate-200"
              />
            )}
            <div className="flex-1 space-y-2">
              <p className="text-xs font-semibold text-slate-700">Código Pix Copia e Cola ({formatBRL(createdInvoice.amountCents)})</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdInvoice.pixCopyPaste}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-700"
                />
                <Button type="button" size="sm" variant="outline" onClick={copyPix} className="shrink-0 gap-1 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

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
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-slate-600"
                    onClick={() => downloadReceiptPdf(payment)}
                  >
                    <Download className="h-3 w-3" />
                    PDF
                  </Button>
                  <p className="text-xs text-emerald-700 font-medium">
                    +{payment.awardedXp} XP · +{payment.awardedCoins} moedas
                  </p>
                </div>
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
