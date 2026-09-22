"use client";

import { useState, useTransition } from "react";
import { confirmInvoicePaymentAction, logWhatsAppBillingSentAction } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/student-finance";
import { formatDate } from "@/lib/utils";
import { Check, ExternalLink, Eye, X, MessageSquare, AlertCircle } from "lucide-react";
import {
  generateInvoiceWhatsAppMessage,
  generateWhatsAppLink,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp-billing";

export interface PendingInvoiceItem {
  id: string;
  title: string;
  amountCents: number;
  dueDate: Date | string;
  status: string;
  pixCopyPaste?: string | null;
  proofAttachmentUrl?: string | null;
  proofUploadedAt?: Date | string | null;
  student: {
    id: string;
    user: { fullName: string; email: string };
    classGroup?: { name: string } | null;
    parentLinks?: {
      parent: { id: string; fullName: string; phone?: string | null };
    }[];
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
  const [noPhoneModalStudent, setNoPhoneModalStudent] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleWhatsAppCharge(inv: PendingInvoiceItem) {
    const parent = inv.student.parentLinks?.[0]?.parent;
    const phone = parent?.phone;
    const normalizedPhone = phone ? normalizeWhatsAppNumber(phone) : null;

    if (!normalizedPhone) {
      setNoPhoneModalStudent({ id: inv.student.id, name: inv.student.user.fullName });
      return;
    }

    const message = generateInvoiceWhatsAppMessage(
      {
        id: inv.id,
        title: inv.title,
        amountCents: inv.amountCents,
        dueDate: inv.dueDate,
        pixCopyPaste: inv.pixCopyPaste,
        studentName: inv.student.user.fullName,
        parentName: parent?.fullName,
      },
      "Ecohub"
    );

    const link = generateWhatsAppLink(normalizedPhone, message);
    if (link) {
      logWhatsAppBillingSentAction(inv.id).catch(() => {});
      window.open(link, "_blank", "noopener,noreferrer");
    }
  }

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
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    onClick={() => handleWhatsAppCharge(inv)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    Cobrar via WhatsApp
                  </Button>

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

        {/* Modal Alerta Responsável Sem WhatsApp */}
        {noPhoneModalStudent && (
          <Modal
            open={!!noPhoneModalStudent}
            onClose={() => setNoPhoneModalStudent(null)}
            title="Responsável Sem WhatsApp Cadastrado"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                <p>
                  O responsável vinculado ao aluno <strong>{noPhoneModalStudent.name}</strong> não possui número de WhatsApp/Telemóvel cadastrado.
                </p>
              </div>

              <p className="text-xs text-slate-600">
                Acesse o perfil do aluno para cadastrar ou atualizar o número de telefone do encarregado de educação.
              </p>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setNoPhoneModalStudent(null)}>
                  Fechar
                </Button>
                <a
                  href={`/dashboard/alunos/${noPhoneModalStudent.id}`}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Atualizar Perfil do Aluno
                </a>
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
