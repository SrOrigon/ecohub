"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/student-finance";
import { X, CheckCircle2, XCircle, Settings, XSquare, CreditCard, Send, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// Dummy data mirroring real recurrence events
const RECURRENCE_DATA = [
  {
    id: "REC-98213",
    billingNo: "55912",
    sacado: {
      name: "João Silva Sauro",
      role: "Responsável Financeiro",
      student: "Maria Eduarda Silva",
    },
    category: "Mensalidade",
    installment: "7 / 12",
    dates: {
      dueDate: "10/11/2026",
      sentAt: "10/11/2026 08:30",
      updatedAt: "10/11/2026 08:35",
    },
    amount: 145000, // in cents
    status: { label: "Paga", color: "green" },
    card: { brand: "Mastercard", last4: "4412" },
    apiMessage: "Transação autorizada com sucesso.",
  },
  {
    id: "REC-98214",
    billingNo: "55913",
    sacado: {
      name: "Ana Costa",
      role: "Responsável Financeiro",
      student: "Pedro Costa",
    },
    category: "Mensalidade",
    installment: "7 / 12",
    dates: {
      dueDate: "15/11/2026",
      sentAt: "15/11/2026 08:30",
      updatedAt: "15/11/2026 08:31",
    },
    amount: 145000,
    status: { label: "Recusada", color: "red" },
    card: { brand: "Visa", last4: "1190" },
    apiMessage: "Transação negada pelo banco emissor (Saldo insuficiente).",
  },
];

export function RecurrenceLogTable() {
  const [selectedRow, setSelectedRow] = useState<typeof RECURRENCE_DATA[0] | null>(null);

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Código</th>
                <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Nº Cobrança</th>
                <th scope="col" className="px-4 py-3 font-semibold min-w-[200px]">Aluno/Resp./Cliente</th>
                <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Categoria</th>
                <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap text-center">Parcela</th>
                <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Datas</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap">Valor</th>
                <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Cartão</th>
                <th scope="col" className="px-4 py-3 font-semibold min-w-[200px]">Mensagem API</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {RECURRENCE_DATA.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "transition-colors cursor-pointer group",
                    selectedRow?.id === row.id
                      ? "bg-indigo-50/50 dark:bg-indigo-900/20"
                      : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  )}
                  onClick={() => setSelectedRow(row)}
                >
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                    {row.id}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.billingNo}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{row.sacado.name}</span>
                      <span className="text-[11px] text-slate-500">{row.sacado.role}</span>
                      <span className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">Aluno: {row.sacado.student}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.category}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center font-medium text-slate-700 dark:text-slate-300">
                    {row.installment}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col text-[11px] leading-snug gap-0.5">
                      <div><span className="text-slate-400 w-12 inline-block">Venc:</span> <strong className="text-slate-700 dark:text-slate-300">{row.dates.dueDate}</strong></div>
                      <div><span className="text-slate-400 w-12 inline-block">Envio:</span> <span className="text-slate-600 dark:text-slate-400">{row.dates.sentAt}</span></div>
                      <div><span className="text-slate-400 w-12 inline-block">Atualiz:</span> <span className="text-slate-600 dark:text-slate-400">{row.dates.updatedAt}</span></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                    {formatBRL(row.amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {row.status.color === "green" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${
                        row.status.color === "green" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                      }`}>
                        {row.status.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                        {row.card.brand}
                      </span>
                      <span className="text-xs text-slate-500">**** {row.card.last4}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 max-w-[200px]">
                    {row.apiMessage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Drawer */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedRow(null)}
          />

          {/* Drawer Panel */}
          <div className="absolute inset-y-0 right-0 w-full max-w-sm flex flex-col bg-white shadow-xl dark:bg-slate-950 animate-in slide-in-from-right-full duration-300">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Ações da Assinatura
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedRow.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content / Actions */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800 mb-6">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedRow.sacado.name}</div>
                <div className="text-sm text-slate-500 mt-1">Status: {selectedRow.status.label} - {formatBRL(selectedRow.amount)}</div>
              </div>

              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80">
                <Settings className="h-5 w-5 text-indigo-500" />
                Editar Plano
              </button>

              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80">
                <XSquare className="h-5 w-5 text-amber-500" />
                Cancelar/Estornar
              </button>

              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80">
                <CreditCard className="h-5 w-5 text-blue-500" />
                Alterar Dados do Cartão
              </button>

              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80">
                <Send className="h-5 w-5 text-emerald-500" />
                <div className="flex flex-col items-start">
                  <span>Solicitar Dados</span>
                  <span className="text-[10px] text-slate-400 font-normal">via E-mail, SMS ou WhatsApp</span>
                </div>
              </button>

              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80">
                <RotateCcw className="h-5 w-5 text-slate-500" />
                Reenviar Cobrança
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
