"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Search, Calendar, FileText, Printer, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentDataTable } from "./payment-data-table";
import { RecurrenceLogPanel } from "./recurrence-log-panel";

const TABS = [
  "Geração de Boletos",
  "Boletos Liquidados",
  "Geração de Pix",
  "Pix Liquidados",
  "Log de Recorrência",
];

export function PaymentManagementPanel() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [sacadoScope, setSacadoScope] = useState("todos");

  return (
    <div className="space-y-6">
      {/* 1. Barra de Abas Superiores */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-hidden",
              activeTab === tab
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab !== "Log de Recorrência" ? (
        <>
          {/* 2. Seção de Filtros Avançados */}
          <Card className="border-slate-200 shadow-sm dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardContent className="p-5">
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Radio buttons - Sacado */}
              <div className="space-y-3">
                <Label className="text-slate-700 dark:text-slate-300">Escopo do Sacado</Label>
                <div className="flex items-center gap-4 mt-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="sacado"
                      value="todos"
                      checked={sacadoScope === "todos"}
                      onChange={(e) => setSacadoScope(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-600"
                    />
                    Todos
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="sacado"
                      value="aluno"
                      checked={sacadoScope === "aluno"}
                      onChange={(e) => setSacadoScope(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-600"
                    />
                    Aluno
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="sacado"
                      value="cliente"
                      checked={sacadoScope === "cliente"}
                      onChange={(e) => setSacadoScope(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-600"
                    />
                    Cliente/Empresa
                  </label>
                </div>
              </div>

              {/* Responsável Financeiro */}
              <div>
                <Label htmlFor="responsavel">Responsável Financeiro</Label>
                <Select id="responsavel" name="responsavel">
                  <option value="">Selecione...</option>
                  <option value="responsavel">Responsável (Pessoa Física)</option>
                  <option value="empresa">Empresa (Pessoa Jurídica)</option>
                </Select>
              </div>

              {/* Categoria */}
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Select id="categoria" name="categoria">
                  <option value="">Todas as categorias</option>
                  <option value="mensalidade">Mensalidade</option>
                  <option value="material">Material Didático</option>
                  <option value="taxa">Taxa Administrativa</option>
                </Select>
              </div>

              {/* Turma */}
              <div>
                <Label htmlFor="turma">Turma</Label>
                <Select id="turma" name="turma">
                  <option value="">Todas as turmas</option>
                  <option value="turma_a">Turma A</option>
                  <option value="turma_b">Turma B</option>
                </Select>
              </div>

              {/* Datas de Vencimento */}
              <div className="space-y-1 min-w-0 md:col-span-2">
                <Label>Vencimento entre</Label>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex-1 min-w-0">
                    <Input type="date" className="pl-3 pr-8 text-sm w-full min-w-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
                    <Calendar className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <span className="text-slate-400 shrink-0">e</span>
                  <div className="relative flex-1 min-w-0">
                    <Input type="date" className="pl-3 pr-8 text-sm w-full min-w-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
                    <Calendar className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Datas de Geração */}
              <div className="space-y-1 min-w-0 md:col-span-2">
                <Label>Gerado entre</Label>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex-1 min-w-0">
                    <Input type="date" className="pl-3 pr-8 text-sm w-full min-w-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
                    <Calendar className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <span className="text-slate-400 shrink-0">e</span>
                  <div className="relative flex-1 min-w-0">
                    <Input type="date" className="pl-3 pr-8 text-sm w-full min-w-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
                    <Calendar className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* ID Sponte Pay / Gateway */}
              <div>
                <Label htmlFor="gatewayId">ID Sponte Pay / Gateway</Label>
                <Input id="gatewayId" name="gatewayId" placeholder="Ex: 00112233" className="w-full" />
              </div>

                  {/* Botão Filtrar no final do grid */}
              <div className="md:col-span-2 flex items-end justify-end pt-1">
                <Button type="submit" className="gap-2 px-6 min-w-[120px]">
                      <Search className="h-4 w-4" />
                      Filtrar
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 3. Resultados na Tabela de Alta Densidade */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <PaymentDataTable data={[]} />
          </div>

          {/* 4. Barra Inferior de Ações em Lote */}
          <div className="sticky bottom-4 z-20 mt-6 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl shadow-slate-200/50 backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-900/95 dark:shadow-none animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Contexto / Indicador de Lote */}
              <div className="flex items-center gap-2.5 px-1">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600" />
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Ações em Lote
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:inline">
                    Operações rápidas nos boletos e Pix filtrados
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="default"
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-medium text-xs sm:text-sm"
                >
                  <FileText className="h-4 w-4" />
                  Gerar/Enviar
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm"
                >
                  <CheckCircle className="h-4 w-4" />
                  Consultar Situação
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/50 text-xs sm:text-sm"
                >
                  <XCircle className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  variant="ghost"
                  className="gap-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 text-xs sm:text-sm"
                >
                  <Clock className="h-4 w-4" />
                  Histórico
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <RecurrenceLogPanel />
      )}
    </div>
  );
}
