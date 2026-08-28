"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Table,
  Underline,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOCUMENT_MERGE_FIELDS } from "@/lib/document-merge";

type DocumentRichEditorProps = {
  initialHtml: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

function ToolbarButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`inline-flex h-8 w-8 items-center justify-center rounded border text-slate-700 transition-colors ${
        active ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

export function DocumentRichEditor({ initialHtml, onChange, disabled }: DocumentRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialHtml) {
      editorRef.current.innerHTML = initialHtml;
    }
  }, [initialHtml]);

  const sync = useCallback(() => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const exec = useCallback(
    (command: string, value?: string) => {
      if (disabled) return;
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      sync();
    },
    [disabled, sync]
  );

  const insertMergeField = useCallback(
    (key: string) => {
      if (disabled) return;
      editorRef.current?.focus();
      document.execCommand("insertText", false, `<<${key}>>`);
      sync();
    },
    [disabled, sync]
  );

  const insertTable = useCallback(() => {
    if (disabled) return;
    const table = `<table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse"><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></table><p><br></p>`;
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, table);
    sync();
  }, [disabled, sync]);

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <ToolbarButton label="Desfazer" onClick={() => exec("undo")}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Refazer" onClick={() => exec("redo")}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-6 w-px bg-slate-300" />
        <ToolbarButton label="Negrito" onClick={() => exec("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Itálico" onClick={() => exec("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Sublinhado" onClick={() => exec("underline")}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-6 w-px bg-slate-300" />
        <ToolbarButton label="Alinhar à esquerda" onClick={() => exec("justifyLeft")}>
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Centralizar" onClick={() => exec("justifyCenter")}>
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Alinhar à direita" onClick={() => exec("justifyRight")}>
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Justificar" onClick={() => exec("justifyFull")}>
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-6 w-px bg-slate-300" />
        <ToolbarButton label="Lista com marcadores" onClick={() => exec("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Lista numerada" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Inserir tabela" onClick={insertTable}>
          <Table className="h-4 w-4" />
        </ToolbarButton>
        <select
          className="h-8 rounded border border-slate-200 bg-white px-2 text-sm"
          defaultValue="3"
          onChange={(event) => exec("fontSize", event.target.value)}
          disabled={disabled}
          aria-label="Tamanho da fonte"
        >
          <option value="2">Pequeno</option>
          <option value="3">Normal</option>
          <option value="4">Grande</option>
          <option value="5">Muito grande</option>
        </select>
      </div>

      <div className="no-print rounded-lg border border-slate-200 bg-white p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Inserir campos dinâmicos</p>
        <div className="flex flex-wrap gap-1">
          {DOCUMENT_MERGE_FIELDS.map((field) => (
            <Button
              key={field.key}
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => insertMergeField(field.key)}
              className="text-xs"
            >
              {field.label}
            </Button>
          ))}
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        className="document-page min-h-[70vh] rounded-lg border border-slate-300 bg-white p-8 text-[12pt] leading-relaxed text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-indigo-200 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-400 [&_th]:border [&_th]:border-slate-400"
      />
    </div>
  );
}
