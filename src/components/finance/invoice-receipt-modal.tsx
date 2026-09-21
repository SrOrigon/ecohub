"use client";

import { useActionState, useState } from "react";
import { uploadInvoiceProofAction } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { formatBRL } from "@/lib/student-finance";
import { formatDate } from "@/lib/utils";
import { AlertCircle, Check, CheckCircle2, Copy, FileUp, QrCode, Upload } from "lucide-react";
import type { StudentInvoiceDTO } from "@/types/payment-methods";

export function InvoiceReceiptModal({
  invoice,
  schoolPixKey,
  beneficiaryName,
  bankName,
  open,
  onClose,
}: {
  invoice: StudentInvoiceDTO;
  schoolPixKey?: string | null;
  beneficiaryName?: string | null;
  bankName?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; message?: string } | null, formData: FormData) => {
      const res = await uploadInvoiceProofAction(formData);
      if (res.success) {
        setShowUpload(false);
      }
      return res;
    },
    null
  );

  const pixCode = invoice.pixCopyPaste || schoolPixKey || "";

  function handleCopyPix() {
    if (!pixCode) return;
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title={`Pagamento — ${invoice.title}`}>
      <div className="space-y-4">
        {/* Resumo da Fatura */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase font-semibold">Valor da Fatura</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {formatBRL(invoice.amountCents)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Vencimento:</span>
            <span className="font-semibold">{formatDate(invoice.dueDate.toString())}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Status:</span>
            <span className="font-bold uppercase text-amber-600">{invoice.status}</span>
          </div>
        </div>

        {/* QR Code / Copia e Cola */}
        <div className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-950 dark:bg-sky-950/20">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <QrCode className="h-4 w-4 text-sky-600" />
            Pagamento via Pix
          </p>

          {invoice.pixQrCodeBase64 && (
            <div className="flex justify-center py-2">
              <img
                src={invoice.pixQrCodeBase64}
                alt="QR Code Pix"
                className="h-36 w-36 rounded-xl border border-slate-200 shadow-sm"
              />
            </div>
          )}

          {pixCode && (
            <div className="space-y-1.5">
              <Label className="text-xs">Código Pix Copia e Cola</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={pixCode}
                  className="font-mono text-xs text-slate-700 bg-white dark:bg-slate-900"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleCopyPix} className="shrink-0 gap-1 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
            </div>
          )}

          {beneficiaryName && (
            <div className="text-xs text-slate-600 space-y-0.5">
              <p><strong>Beneficiário:</strong> {beneficiaryName}</p>
              {bankName && <p><strong>Banco:</strong> {bankName}</p>}
            </div>
          )}
        </div>

        {/* Botão de Envio de Comprovante */}
        {!showUpload && invoice.status !== "PAID" && (
          <Button
            type="button"
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setShowUpload(true)}
          >
            <FileUp className="h-4 w-4" />
            Já paguei! Anexar comprovante
          </Button>
        )}

        {/* Form para Upload do Comprovante */}
        {showUpload && (
          <form action={formAction} className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Anexar Foto ou PDF do Comprovante
            </p>

            <div>
              <Label htmlFor="proofUrl" className="text-xs">Link/URL da Imagem ou PDF do Comprovante</Label>
              <Input
                id="proofUrl"
                name="proofUrl"
                type="url"
                required
                placeholder="https://sua-nuvem.com/comprovante-pix.pdf ou photo"
              />
            </div>

            {state?.error && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                {state.error}
              </div>
            )}

            {state?.success && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {state.message}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowUpload(false)} className="w-1/2">
                Cancelar
              </Button>
              <Button type="submit" disabled={pending} size="sm" className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white">
                {pending ? "Enviando..." : "Enviar Comprovante"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
