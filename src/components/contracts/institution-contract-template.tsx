"use client";

import { useRef, useState, useTransition } from "react";
import {
  clearContractTemplateAction,
  importContractTemplateDocxAction,
  saveContractTemplateAction,
} from "@/actions/contract-template";
import { DOCUMENT_MERGE_FIELDS } from "@/lib/document-merge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/form-fields";
import { Badge } from "@/components/ui/badge";
import { FileUp, Trash2, Upload } from "lucide-react";

export function InstitutionContractTemplatePanel({
  hasCustomTemplate,
  sourceName,
  updatedAt,
  initialHtml,
}: {
  hasCustomTemplate: boolean;
  sourceName: string | null;
  updatedAt: string | null;
  initialHtml: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [html, setHtml] = useState(initialHtml);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importPending, startImport] = useTransition();
  const [savePending, startSave] = useTransition();
  const [clearPending, startClear] = useTransition();

  function handleImport(file: File) {
    setMessage(null);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    startImport(async () => {
      const result = await importContractTemplateDocxAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(`Modelo "${result.sourceName}" importado e salvo para esta instituição.`);
      window.location.reload();
    });
  }

  function handleSave() {
    setMessage(null);
    setError(null);
    const formData = new FormData();
    formData.append("contractTemplateHtml", html);
    formData.append("sourceName", sourceName ?? "modelo-editado.html");
    startSave(async () => {
      const result = await saveContractTemplateAction(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMessage("Modelo institucional salvo.");
      window.location.reload();
    });
  }

  function handleClear() {
    if (!window.confirm("Remover o modelo personalizado desta instituição? Novos contratos usarão o modelo padrão do sistema.")) {
      return;
    }
    setMessage(null);
    setError(null);
    startClear(async () => {
      await clearContractTemplateAction();
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={hasCustomTemplate ? "success" : "secondary"}>
          {hasCustomTemplate ? "Modelo personalizado ativo" : "Usando modelo padrão do sistema"}
        </Badge>
        {sourceName && <span className="text-xs text-slate-500">Arquivo: {sourceName}</span>}
        {updatedAt && (
          <span className="text-xs text-slate-500">
            Atualizado em {new Date(updatedAt).toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600">
        Cada instituição tem seu próprio modelo de contrato, salvo apenas na conta da escola logada.
        Use campos como <code className="text-xs">&lt;&lt;NomeAluno&gt;&gt;</code> para preenchimento automático.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleImport(file);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={importPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {importPending ? "Importando..." : "Importar .docx"}
        </Button>
        {hasCustomTemplate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-red-600"
            disabled={clearPending}
            onClick={handleClear}
          >
            <Trash2 className="h-4 w-4" />
            {clearPending ? "Removendo..." : "Remover modelo"}
          </Button>
        )}
      </div>

      <div>
        <Label htmlFor="contract-template-html">Modelo HTML da instituição</Label>
        <textarea
          id="contract-template-html"
          value={html}
          onChange={(event) => setHtml(event.target.value)}
          rows={14}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-800"
          spellCheck={false}
        />
        <Button
          type="button"
          size="sm"
          className="mt-2 gap-2"
          disabled={savePending || !html.trim()}
          onClick={handleSave}
        >
          <FileUp className="h-4 w-4" />
          {savePending ? "Salvando..." : "Salvar modelo"}
        </Button>
      </div>

      <details className="rounded-lg border border-slate-200 p-3 text-sm">
        <summary className="cursor-pointer font-medium text-slate-700">Campos de mesclagem disponíveis</summary>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {DOCUMENT_MERGE_FIELDS.map((field) => (
            <li key={field.key} className="text-xs text-slate-600">
              <code>&lt;&lt;{field.key}&gt;&gt;</code> — {field.label}
            </li>
          ))}
        </ul>
      </details>

      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
