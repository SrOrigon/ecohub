"use client";

import { useRef, useState, useTransition } from "react";
import {
  clearContractTemplateAction,
  importContractTemplateDocxAction,
} from "@/actions/contract-template";
import { DOCUMENT_MERGE_FIELDS } from "@/lib/document-merge";
import { sanitizeDocumentHtml } from "@/lib/sanitize-document-html";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload } from "lucide-react";

const visibleFields = DOCUMENT_MERGE_FIELDS.filter((field) => !field.label.includes("Legado"));

function contractPreviewHtml(html: string) {
  const withoutCode = sanitizeDocumentHtml(html);
  return withoutCode.replace(/&lt;&lt;([^&]+)&gt;&gt;|<<([^>]+)>>/g, (_match, encoded: string, raw: string) => {
    const key = (encoded || raw || "").trim();
    return DOCUMENT_MERGE_FIELDS.find((field) => field.key === key)?.label ?? "dado da escola";
  });
}

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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importPending, startImport] = useTransition();
  const [clearPending, startClear] = useTransition();
  const fileLabel = sourceName && !/\.(html?|jsx?|tsx?)$/i.test(sourceName) ? sourceName : null;

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
        {fileLabel && <span className="text-xs text-slate-500">Arquivo: {fileLabel}</span>}
        {updatedAt && (
          <span className="text-xs text-slate-500">
            Atualizado em {new Date(updatedAt).toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600">
        Esta é a prévia do contrato da escola. Importe o arquivo Word para trocar o texto. Os dados do aluno e da instituição entram sozinhos.
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
          {importPending ? "Importando..." : "Importar Word"}
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
        <p className="text-sm font-medium text-slate-800">Prévia do contrato</p>
        {initialHtml.trim() ? (
          <div
            className="mt-2 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 [&_h2]:text-center [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_table]:mt-2 [&_table]:w-full [&_td]:border [&_td]:border-slate-200 [&_td]:p-2"
            dangerouslySetInnerHTML={{ __html: contractPreviewHtml(initialHtml) }}
          />
        ) : (
          <p className="mt-2 rounded-lg border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
            A escola ainda não enviou o modelo. Importe o arquivo Word do contrato.
          </p>
        )}
      </div>

      <details className="rounded-lg border border-slate-200 p-3 text-sm">
        <summary className="cursor-pointer font-medium text-slate-700">Dados que entram no contrato</summary>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {visibleFields.map((field) => (
            <li key={field.key} className="text-xs text-slate-600">
              {field.label}
            </li>
          ))}
        </ul>
      </details>

      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
