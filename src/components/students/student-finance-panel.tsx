"use client";

import { useActionState, useState } from "react";
import { createStudentInvoiceAction, upsertStudentFinanceAction } from "@/actions/student-finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { formatBRL, parseReaisToCents, type FinanceSnapshot, type FinancePaymentRecord } from "@/lib/student-finance";
import { formatDate } from "@/lib/utils";
import { Check, Copy, Download, QrCode } from "lucide-react";
import { StudentInstallmentsBox } from "@/components/finance/student-installments-box";
import { type BillingCharge } from "@/lib/billing-status";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function planStartParts(finance: FinanceSnapshot, charges: BillingCharge[]) {
  const stored = finance.firstDueDate ? new Date(finance.firstDueDate) : null;
  const fromCharge = charges.find((charge) => charge.source !== "invoice");
  const start = stored && !Number.isNaN(stored.getTime()) ? stored : fromCharge ? new Date(fromCharge.dueDate) : null;
  if (!start || Number.isNaN(start.getTime()) || finance.monthlyAmountCents <= 0) {
    return { day: "", month: "", year: "" };
  }
  return {
    day: String(start.getDate()),
    month: String(start.getMonth() + 1),
    year: String(start.getFullYear()),
  };
}

export function StudentFinancePanel({
  studentId,
  studentName,
  className = null,
  finance,
  canWrite,
  charges = [],
}: {
  studentId: string;
  studentName: string;
  className?: string | null;
  finance: FinanceSnapshot;
  canWrite: boolean;
  charges?: BillingCharge[];
}) {
  const [planState, planAction, planPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) =>
      upsertStudentFinanceAction(formData),
    null
  );
  const [createdInvoice, setCreatedInvoice] = useState<{
    amountCents: number;
    pixCopyPaste: string;
    pixQrCode: string;
  } | null>(null);
  const [copied, setCopyState] = useState(false);
  const [generatingPix, setGeneratingPix] = useState(false);
  const [tab, setTab] = useState<"plano" | "parcelas">(canWrite ? "plano" : "parcelas");
  const startParts = planStartParts(finance, charges);
  const [dueDayInput, setDueDayInput] = useState(startParts.day);
  const [dueMonthInput, setDueMonthInput] = useState(startParts.month);
  const [dueYearInput, setDueYearInput] = useState(startParts.year);
  const monthlyDefault =
    finance.monthlyAmountCents > 0
      ? (finance.monthlyAmountCents / 100).toFixed(2).replace(".", ",")
      : "";
  const [amountInput, setAmountInput] = useState(monthlyDefault);
  const [installmentInput, setInstallmentInput] = useState(
    finance.monthlyAmountCents > 0 ? String(finance.expectedInstallments) : ""
  );
  const [discountInput, setDiscountInput] = useState(
    finance.monthlyAmountCents > 0 ? String(finance.discountPercent) : ""
  );

  const amountCents = parseReaisToCents(amountInput) ?? 0;
  const installmentCount = Number(installmentInput);
  const discountPercent = Number(discountInput.replace(",", "."));
  const netCents =
    Number.isFinite(discountPercent) && discountPercent >= 0 && discountPercent <= 100
      ? Math.max(0, Math.round(amountCents * (1 - discountPercent / 100)))
      : amountCents;
  const totalCents =
    Number.isInteger(installmentCount) && installmentCount > 0 ? netCents * installmentCount : 0;

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
      <div className="flex flex-wrap gap-2">
        {canWrite && (
        <button
          type="button"
          onClick={() => setTab("plano")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "plano" ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Dados do plano
        </button>
        )}
        <button
          type="button"
          onClick={() => setTab("parcelas")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "parcelas" ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Parcelas
        </button>
      </div>

      {tab === "parcelas" && (
      <StudentInstallmentsBox
        embedded
        onOpenPlan={() => setTab("plano")}
        studentId={studentId}
        studentName={studentName}
        className={className}
        discountPercent={finance.discountPercent}
        charges={charges}
        canSettle={canWrite}
      />
      )}

      {tab !== "plano" && (
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
      )}

      {canWrite && tab === "plano" && (
        <form id="dados-do-plano" action={planAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <input type="hidden" name="studentId" value={studentId} />
          <div>
            <p className="font-medium text-slate-900">Dados do plano</p>
            <p className="text-sm text-slate-600">
              A escola informa o valor, a quantidade e o primeiro vencimento, com dia, mês e ano. O total é calculado em seguida.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="monthlyAmount">Valor da parcela (R$)</Label>
              <Input
                id="monthlyAmount"
                name="monthlyAmount"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                placeholder="Definir"
                inputMode="decimal"
              />
            </div>
            <div>
              <Label htmlFor="expectedInstallments">Parcelas</Label>
              <Input
                id="expectedInstallments"
                name="expectedInstallments"
                type="number"
                min={1}
                max={24}
                value={installmentInput}
                onChange={(event) => setInstallmentInput(event.target.value)}
                placeholder="Qtd."
              />
            </div>
            <div>
              <Label htmlFor="planTotal">Valor total</Label>
              <Input id="planTotal" value={totalCents > 0 ? formatBRL(totalCents) : "—"} readOnly />
            </div>
            <div>
              <Label htmlFor="dueDay">Dia</Label>
              <Input
                id="dueDay"
                name="dueDay"
                type="number"
                min={1}
                max={31}
                required
                value={dueDayInput}
                onChange={(event) => setDueDayInput(event.target.value)}
                placeholder="Dia"
              />
            </div>
            <div>
              <Label htmlFor="dueMonth">Mês</Label>
              <Select
                id="dueMonth"
                name="dueMonth"
                required
                value={dueMonthInput}
                onChange={(event) => setDueMonthInput(event.target.value)}
              >
                <option value="">Mês</option>
                {MONTHS.map((name, index) => (
                  <option key={name} value={String(index + 1)}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="dueYear">Ano</Label>
              <Input
                id="dueYear"
                name="dueYear"
                type="number"
                min={2000}
                max={2100}
                required
                value={dueYearInput}
                onChange={(event) => setDueYearInput(event.target.value)}
                placeholder="Ano"
              />
            </div>
            <div>
              <Label htmlFor="discountPercent">Bolsa de desconto %</Label>
              <Input
                id="discountPercent"
                name="discountPercent"
                value={discountInput}
                onChange={(event) => setDiscountInput(event.target.value)}
                placeholder="0"
                inputMode="decimal"
              />
            </div>
          </div>
          {planState?.error && <p className="text-sm text-red-600">{planState.error}</p>}
          {planState?.success && <p className="text-sm text-emerald-600">Plano salvo pela instituição.</p>}
          <Button type="submit" disabled={planPending} size="sm">
            {planPending ? "Salvando..." : "Salvar plano"}
          </Button>
        </form>
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
