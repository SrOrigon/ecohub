"use client";

import { useState } from "react";
import { bulkImportStudentsAction, type StudentImportRecord } from "@/actions/bulk-import-students";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload, Users } from "lucide-react";

export function BulkImportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [records, setRecords] = useState<StudentImportRecord[]>([]);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleDownloadTemplate() {
    const csvContent =
      "Nome do Aluno,Data Nasc (AAAA-MM-DD),Nome do Responsável,Telefone Responsável,Email Responsável,Turma\n" +
      "Lucas Silva,2015-05-20,Maria Silva,11999998888,maria.silva@email.com,5º Ano A\n" +
      "Ana Souza,2016-08-12,João Souza,11988887777,joao.souza@email.com,4º Ano B\n";

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "modelo_importacao_alunos_ecohub.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setSuccessMessage(null);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = parseCsv(text);
        if (parsed.length === 0) {
          setError("O arquivo CSV está vazio ou em formato inválido.");
          setRecords([]);
        } else {
          setRecords(parsed);
        }
      } catch {
        setError("Erro ao ler o arquivo CSV. Verifique a formatação.");
      } finally {
        setParsing(false);
      }
    };
    reader.readAsText(selectedFile, "UTF-8");
  }

  function parseCsv(csvText: string): StudentImportRecord[] {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const parsedRecords: StudentImportRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

      if (cols.length >= 3) {
        parsedRecords.push({
          studentName: cols[0] || "",
          birthDate: cols[1] || "",
          parentName: cols[2] || "",
          parentPhone: cols[3] || "",
          parentEmail: cols[4] || "",
          className: cols[5] || cols[3] || "Turma Geral",
        });
      }
    }

    return parsedRecords;
  }

  async function handleSubmit() {
    if (records.length === 0) {
      setError("Nenhum registro válido para importar.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await bulkImportStudentsAction(records);
      if (res.error) {
        setError(res.error);
      } else if (res.success) {
        setSuccessMessage(res.message || "Importação concluída com sucesso!");
        setRecords([]);
        setFile(null);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erro durante a importação.";
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Importação de Alunos em Massa (.CSV)">
      <div className="space-y-4">
        {/* Descrição & Botão de Modelo */}
        <div className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-indigo-900/50 dark:bg-indigo-950/20">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
              Modelo de Importação Rápida
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Baixe nossa planilha modelo para preencher nome do aluno, turma e responsáveis.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="shrink-0 gap-1.5 border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 dark:bg-slate-900 dark:text-indigo-300"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar Modelo (.CSV)
          </Button>
        </div>

        {/* Input / Drag and Drop */}
        <div className="relative rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-indigo-400 dark:border-slate-800">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <div className="flex flex-col items-center justify-center space-y-2 text-slate-600 dark:text-slate-400">
            <Upload className="h-8 w-8 text-indigo-500" />
            <p className="text-sm font-semibold">
              {file ? file.name : "Clique ou arraste o arquivo CSV aqui"}
            </p>
            <p className="text-xs text-slate-400">Suporta codificação UTF-8</p>
          </div>
        </div>

        {/* Feedback visual de erros / sucesso */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}

        {/* Pré-visualização das linhas lidas */}
        {records.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600" />
                Pré-visualização ({records.length} alunos identificados)
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 sticky top-0 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="p-2">Aluno</th>
                    <th className="p-2">Turma</th>
                    <th className="p-2">Responsável</th>
                    <th className="p-2">Telefone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {records.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2 font-medium text-slate-900 dark:text-white">{r.studentName || "—"}</td>
                      <td className="p-2 text-indigo-600 font-semibold">{r.className || "—"}</td>
                      <td className="p-2 text-slate-600 dark:text-slate-400">{r.parentName || "—"}</td>
                      <td className="p-2 text-slate-500">{r.parentPhone || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ações do Modal */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
          {records.length > 0 && (
            <Button
              type="button"
              size="sm"
              disabled={submitting || parsing}
              onClick={handleSubmit}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {submitting ? "Importando..." : `Confirmar e Importar ${records.length} Alunos`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
