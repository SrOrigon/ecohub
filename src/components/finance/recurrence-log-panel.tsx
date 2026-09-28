"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RecurrenceLogTable } from "./recurrence-log-table";

const SUB_TABS = [
  "Log de Recorrência",
  "Planos sem cartão cadastrado",
  "Dados da Integração",
];

export function RecurrenceLogPanel() {
  const [activeTab, setActiveTab] = useState(SUB_TABS[0]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Sub-Tabs de Integração */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-700"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Conditional Content based on active tab */}
      {activeTab === "Log de Recorrência" && (
        <RecurrenceLogTable />
      )}

      {activeTab === "Planos sem cartão cadastrado" && (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-12 text-center flex flex-col items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400">
            Nenhum plano sem cartão cadastrado encontrado no momento.
          </p>
        </div>
      )}

      {activeTab === "Dados da Integração" && (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-12 text-center flex flex-col items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400">
            Configurações e credenciais do gateway de recorrência.
          </p>
        </div>
      )}

    </div>
  );
}
