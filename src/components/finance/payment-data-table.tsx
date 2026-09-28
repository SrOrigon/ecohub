"use client";

import { MessageCircle, Link as LinkIcon, Printer, History, Info, User, CheckCircle2, CircleDashed } from "lucide-react";
import { formatBRL } from "@/lib/student-finance";

// Dummy data structure mirroring exact hierarchical needs
const MOCK_DATA = [
  {
    id: "B-10923",
    type: "Boleto",
    plan: "Mensalidade 2026",
    sacado: {
      name: "João Silva Sauro",
      role: "Responsável Financeiro",
      student: "Maria Eduarda Silva",
    },
    amount: 145000, // in cents
    dates: {
      dueDate: "10/11/2026",
      generatedAt: "01/11/2026",
      displayedAt: "02/11/2026",
    },
    category: "Mensalidade",
    status: { label: "Gerado", color: "blue" },
  },
  {
    id: "P-55912",
    type: "Pix",
    plan: "Material Didático",
    sacado: {
      name: "Ana Costa",
      role: "Responsável Financeiro",
      student: "Pedro Costa",
    },
    amount: 35000,
    dates: {
      dueDate: "15/11/2026",
      generatedAt: "05/11/2026",
      displayedAt: "05/11/2026",
    },
    category: "Material",
    status: { label: "Pago", color: "green" },
  },
  {
    id: "B-10924",
    type: "Boleto",
    plan: "Taxa de Matrícula",
    sacado: {
      name: "Empresa XPTO Ltda",
      role: "Pessoa Jurídica",
      student: "Lucas XPTO",
    },
    amount: 50000,
    dates: {
      dueDate: "05/11/2026",
      generatedAt: "20/10/2026",
      displayedAt: "21/10/2026",
    },
    category: "Taxa",
    status: { label: "Vencido", color: "red" },
  },
];

export function PaymentDataTable() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th scope="col" className="p-4 w-12">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
              </th>
              <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Nº</th>
              <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Plano</th>
              <th scope="col" className="px-4 py-3 font-semibold text-center whitespace-nowrap">Cadastro</th>
              <th scope="col" className="px-4 py-3 font-semibold min-w-[200px]">Sacado</th>
              <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap">Valor</th>
              <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Datas</th>
              <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Categoria</th>
              <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Situação</th>
              <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {MOCK_DATA.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50 transition-colors group dark:hover:bg-slate-900/50"
              >
                <td className="p-4 w-12">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{row.id}</span>
                  <div className="text-[11px] text-slate-400">{row.type}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                  {row.plan}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <button className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700" title="Ver Cadastro">
                    <User className="h-4 w-4" />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{row.sacado.name}</span>
                    <span className="text-[11px] text-slate-500">{row.sacado.role}</span>
                    <span className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">Ref: {row.sacado.student}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                  {formatBRL(row.amount)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col text-[11px] leading-snug gap-0.5">
                    <div><span className="text-slate-400 w-12 inline-block">Venc:</span> <strong className="text-slate-700 dark:text-slate-300">{row.dates.dueDate}</strong></div>
                    <div><span className="text-slate-400 w-12 inline-block">Gerado:</span> <span className="text-slate-600 dark:text-slate-400">{row.dates.generatedAt}</span></div>
                    <div><span className="text-slate-400 w-12 inline-block">Exibido:</span> <span className="text-slate-600 dark:text-slate-400">{row.dates.displayedAt}</span></div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {row.category}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {row.status.color === "green" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <CircleDashed className={`h-3.5 w-3.5 ${row.status.color === "blue" ? "text-blue-500" : "text-red-500"}`} />
                    )}
                    <span className={`text-xs font-medium ${
                      row.status.color === "green" ? "text-emerald-700 dark:text-emerald-400" :
                      row.status.color === "blue" ? "text-blue-700 dark:text-blue-400" :
                      "text-red-700 dark:text-red-400"
                    }`}>
                      {row.type} {row.status.label}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md dark:text-emerald-400 dark:hover:bg-emerald-950/50" title="Enviar WhatsApp">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md dark:hover:bg-slate-800" title="Copiar Link/Pix">
                      <LinkIcon className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md dark:hover:bg-slate-800" title="Imprimir">
                      <Printer className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md dark:hover:bg-slate-800" title="Histórico">
                      <History className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md dark:hover:bg-slate-800" title="Detalhes">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50/50 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:bg-slate-900/50 dark:border-slate-800 flex justify-between items-center">
        <span>Mostrando {MOCK_DATA.length} registros</span>
        <div className="flex gap-1">
          <button className="px-2 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900 disabled:opacity-50">Anterior</button>
          <button className="px-2 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900">Próxima</button>
        </div>
      </div>
    </div>
  );
}
