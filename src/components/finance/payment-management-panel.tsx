"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Search, Calendar, FileText, Printer, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentDataTable } from "./payment-data-table";

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

      {/* 2. Seção de Filtros Avançados */}
      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
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
              <div className="space-y-1">
                <Label>Vencimento entre</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input type="date" className="pl-9 text-sm" />
                  </div>
                  <span className="text-slate-400">e</span>
                  <div className="relative flex-1">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input type="date" className="pl-9 text-sm" />
                  </div>
                </div>
              </div>

              {/* Datas de Geração */}
              <div className="space-y-1">
                <Label>Gerado entre</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input type="date" className="pl-9 text-sm" />
                  </div>
                  <span className="text-slate-400">e</span>
                  <div className="relative flex-1">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input type="date" className="pl-9 text-sm" />
                  </div>
                </div>
              </div>

              {/* ID Sponte Pay / Gateway */}
              <div>
                <Label htmlFor="gatewayId">ID Sponte Pay / Gateway</Label>
                <Input id="gatewayId" name="gatewayId" placeholder="Ex: 00112233" />
              </div>

              {/* Botão Filtrar no final do grid */}
              <div className="md:col-span-2 flex items-end justify-end">
                <Button type="submit" className="gap-2 px-6">
                  <Search className="h-4 w-4" />
                  Filtrar
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 3. Resultados na Tabela de Alta Densidade */}
      <PaymentDataTable />

      {/* 4. Barra Inferior de Ações em Lote */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm sm:left-[240px] dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <Button variant="default" className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-xs">
            <FileText className="h-4 w-4" />
            Gerar/Enviar
          </Button>
          <Button variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Consultar Situação
          </Button>
          <Button variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/50">
            <XCircle className="h-4 w-4" />
            Cancelar
          </Button>
          <Button variant="ghost" className="gap-2">
            <Clock className="h-4 w-4" />
            Histórico
          </Button>
        </div>
      </div>
    </div>
  );
}
