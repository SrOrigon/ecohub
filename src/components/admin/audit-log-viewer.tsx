"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, Download, Search, Filter, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type AuditLogEntry } from "@/actions/audit";
import { cn } from "@/lib/utils";

export function AuditLogViewer({
  initialLogs = [],
}: {
  initialLogs: AuditLogEntry[];
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = ["all", "Notas", "Frequência", "Documentos", "Gamificação"];

  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      if (selectedCategory !== "all" && log.category !== selectedCategory) {
        return false;
      }
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        log.action.toLowerCase().includes(term) ||
        log.operatorName.toLowerCase().includes(term) ||
        (log.targetName && log.targetName.toLowerCase().includes(term)) ||
        log.details.toLowerCase().includes(term)
      );
    });
  }, [initialLogs, search, selectedCategory]);

  function handleExportCsv() {
    const headers = ["ID", "Categoria", "Ação", "Operador", "Aluno/Alvo", "Detalhes", "Data e Hora"];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.category,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.operatorName.replace(/"/g, '""')}"`,
      `"${(l.targetName ?? "").replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      l.timestamp,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `auditoria-ecohub-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por operador, aluno ou detalhe da ação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              {cat === "all" ? "Todas as Categorias" : cat}
            </button>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs font-bold"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4">Data e Hora</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3">Ação</th>
                <th className="py-3 px-3">Operador</th>
                <th className="py-3 px-3">Aluno / Alvo</th>
                <th className="py-3 px-4">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {log.category}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {log.operatorName}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                      {log.targetName ?? "—"}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
