"use client";

import { useMemo, useState } from "react";
import { Download, Search, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { type AuditLogEntry } from "@/actions/audit";

export function AuditLogViewer({
  initialLogs = [],
}: {
  initialLogs: AuditLogEntry[];
}) {
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const actionTypes = useMemo(() => {
    const set = new Set(initialLogs.map((l) => l.action));
    return ["all", ...Array.from(set)];
  }, [initialLogs]);

  const uniqueOperators = useMemo(() => {
    const set = new Set(initialLogs.map((l) => l.operatorName));
    return ["all", ...Array.from(set)];
  }, [initialLogs]);

  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      if (selectedAction !== "all" && log.action !== selectedAction) {
        return false;
      }
      if (selectedUser !== "all" && log.operatorName !== selectedUser) {
        return false;
      }

      if (startDate) {
        const logDate = new Date(log.timestamp).getTime();
        const start = new Date(startDate).getTime();
        if (logDate < start) return false;
      }

      if (endDate) {
        const logDate = new Date(log.timestamp).getTime();
        const end = new Date(`${endDate}T23:59:59`).getTime();
        if (logDate > end) return false;
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
  }, [initialLogs, search, selectedAction, selectedUser, startDate, endDate]);

  function handleExportCsv() {
    const headers = [
      "ID",
      "Entidade",
      "Acao",
      "Papel",
      "Operador",
      "Alvo",
      "Detalhes",
      "IP",
      "Data_Hora",
    ];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.category,
      `"${l.action.replace(/"/g, '""')}"`,
      l.actorRole,
      `"${l.operatorName.replace(/"/g, '""')}"`,
      `"${(l.targetName ?? "").replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress ?? "",
      l.timestamp,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `auditoria-lgpd-ecohub-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExportPdf() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Auditoria & Governança LGPD</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; color: #1e293b; }
            h1 { font-size: 20px; color: #0f172a; margin-bottom: 4px; }
            p.sub { font-size: 12px; color: #64748b; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { bg-color: #f1f5f9; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Relatório Oficial de Auditoria & Governança LGPD</h1>
          <p class="sub">Gerado em ${new Date().toLocaleString("pt-BR")} | Registros: ${filteredLogs.length}</p>
          <table>
            <thead>
              <tr>
                <th>Data e Hora</th>
                <th>Operador</th>
                <th>Papel</th>
                <th>Ação</th>
                <th>Entidade / Alvo</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs
                .map(
                  (l) => `
                <tr>
                  <td>${new Date(l.timestamp).toLocaleString("pt-BR")}</td>
                  <td>${l.operatorName}</td>
                  <td>${l.actorRole}</td>
                  <td>${l.action}</td>
                  <td>${l.targetName ?? l.category}</td>
                  <td>${l.details}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por operador, ação ou detalhes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Início:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 w-32 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Fim:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 w-32 text-xs"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">Todas Ações</option>
            {actionTypes
              .filter((a) => a !== "all")
              .map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
          </select>

          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">Todos Usuários</option>
            {uniqueOperators
              .filter((u) => u !== "all")
              .map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 gap-1 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            className="h-8 gap-1 text-xs font-semibold"
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4">Data e Hora</th>
                <th className="py-3 px-3">Papel</th>
                <th className="py-3 px-3">Ação</th>
                <th className="py-3 px-3">Operador</th>
                <th className="py-3 px-3">Entidade / Alvo</th>
                <th className="py-3 px-4">Detalhes do Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhum registro de auditoria encontrado para os filtros selecionados.
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
                        {log.actorRole}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {log.operatorName}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                      {log.targetName ?? log.category}
                    </td>
                    <td
                      className="py-2.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate"
                      title={log.details}
                    >
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
