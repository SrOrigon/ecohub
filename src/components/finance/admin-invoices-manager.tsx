"use client";

import { useState, useTransition } from "react";
import { confirmInvoicePaymentAction } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/student-finance";
import { formatDate } from "@/lib/utils";
import { Check, ExternalLink, Eye, X } from "lucide-react";

export interface PendingInvoiceItem {
  id: string;
  title: string;
  amountCents: number;
  dueDate: Date | string;
  status: string;
  proofAttachmentUrl?: string | null;
  proofUploadedAt?: Date | string | null;
  student: {
    user: { fullName: string; email: string };
    classGroup?: { name: string } | null;
  };
}

export function AdminInvoicesManager({
  pendingInvoices = [],
}: {
  pendingInvoices: PendingInvoiceItem[];
}) {
  const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoiceItem | null>(null);
  const [previewProof, setPreviewProof] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleApprove(invoiceId: string) {
    const formData = new FormData();
    formData.set("invoiceId", invoiceId);
    formData.set("isApproved", "true");

    startTransition(async () => {
      await confirmInvoicePaymentAction(formData);
      setSelectedInvoice(null);
    });
  }

  function handleRejectSubmit() {
    if (!selectedInvoice) return;

    const formData = new FormData();
    formData.set("invoiceId", selectedInvoice.id);
    formData.set("isApproved", "false");
    formData.set("rejectReason", rejectReason);

    startTransition(async () => {
      await confirmInvoicePaymentAction(formData);
      setRejectModalOpen(false);
      setSelectedInvoice(null);
      setRejectReason("");
    });
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            Faturas Aguardando Confirmação
          </span>
          <Badge variant="warning">{pendingInvoices.length} pendente(s)</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingInvoices.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            Nenhum comprovante pendente de análise na secretaria.
          </p>
        ) : (
          <div className="space-y-3">
            {pendingInvoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{inv.title}</p>
                  <p className="text-xs text-slate-500">
                    {inv.student.user.fullName} ({inv.student.classGroup?.name ?? "Sem turma"}) · Venc: {formatDate(inv.dueDate.toString())}
                  </p>
                  {inv.proofUploadedAt && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                      Comprovante enviado em {formatDate(inv.proofUploadedAt.toString())}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white mr-2 text-sm">
                    {formatBRL(inv.amountCents)}
                  </span>

                  {inv.proofAttachmentUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => setPreviewProof(inv.proofAttachmentUrl!)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver Comprovante
                    </Button>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={isPending}
                    onClick={() => handleApprove(inv.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Aprovar
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    disabled={isPending}
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setRejectModalOpen(true);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Recusar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Pré-visualização do Comprovante */}
        {previewProof && (
          <Modal open={!!previewProof} onClose={() => setPreviewProof(null)} title="Comprovante de Pagamento">
            <div className="space-y-4">
              <div className="flex justify-center rounded-lg border border-slate-200 p-2 bg-slate-50 min-h-[200px]">
                <img
                  src={previewProof}
                  alt="Comprovante"
                  className="max-h-96 object-contain rounded-md"
                  onError={(e) => {
                    // Fallback para link se imagem não carregar diretamente
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              <div className="flex justify-between items-center">
                <a
                  href={previewProof}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir comprovante em nova aba
                </a>
                <Button type="button" variant="outline" size="sm" onClick={() => setPreviewProof(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal de Recusa de Comprovante */}
        {rejectModalOpen && selectedInvoice && (
          <Modal
            open={rejectModalOpen}
            onClose={() => setRejectModalOpen(false)}
            title="Recusar Comprovante de Pagamento"
          >
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Informe o motivo da recusa. O responsável/aluno receberá uma notificação para enviar um novo comprovante.
              </p>

              <div>
                <label htmlFor="rejectReason" className="text-xs font-semibold text-slate-800">
                  Motivo da Recusa
                </label>
                <input
                  id="rejectReason"
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: Valor no comprovante divergente da fatura"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setRejectModalOpen(false)} className="w-1/2">
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  className="w-1/2 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleRejectSubmit}
                >
                  Confirmar Recusa
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </CardContent>
    </Card>
  );
}
