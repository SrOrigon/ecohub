"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { Download, FileUp, Printer, Save, Trash2 } from "lucide-react";
import { saveStudentDocumentAction, deleteStudentDocumentAction } from "@/actions/student-documents";
import { DocumentRichEditor } from "@/components/documents/document-rich-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Badge } from "@/components/ui/badge";
import { documentStatusLabel } from "@/lib/document-types";

type SaveState = { success?: boolean; error?: string } | null;

type DocumentEditorFormProps = {
  documentId: string;
  documentType: string;
  title: string;
  contractNumber: string | null;
  classId: string | null;
  contractStartDate: Date | null;
  contractEndDate: Date | null;
  status: string;
  initialHtml: string;
  studentName: string;
  classes: Array<{ id: string; name: string }>;
};

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function DocumentEditorForm({
  documentId,
  documentType,
  title: initialTitle,
  contractNumber: initialContractNumber,
  classId: initialClassId,
  contractStartDate,
  contractEndDate,
  status: initialStatus,
  initialHtml,
  studentName,
  classes,
}: DocumentEditorFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialTitle);
  const [contractNumber, setContractNumber] = useState(initialContractNumber ?? "");
  const [classId, setClassId] = useState(initialClassId ?? "");
  const [startDate, setStartDate] = useState(toDateInputValue(contractStartDate));
  const [endDate, setEndDate] = useState(toDateInputValue(contractEndDate));
  const [contentHtml, setContentHtml] = useState(initialHtml);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<SaveState, FormData>(saveStudentDocumentAction, null);

  const saveMessage = state?.success ? "Documento salvo com sucesso." : state?.error ?? null;

  async function handleImportDocx(file: File) {
    setImporting(true);
    setImportMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/documents/import-docx", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { html?: string; error?: string };
      if (!response.ok || !payload.html) {
        setImportMessage(payload.error ?? "Não foi possível importar o arquivo Word.");
        return;
      }
      setContentHtml(payload.html);
      setImportMessage("Documento Word importado. Revise o conteúdo e salve.");
    } catch {
      setImportMessage("Falha ao importar o arquivo Word.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Aluno: {studentName}</p>
          <Badge variant={initialStatus === "final" ? "success" : "warning"}>
            {documentStatusLabel(initialStatus)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImportDocx(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="h-4 w-4" />
            {importing ? "Importando..." : "Importar Word"}
          </Button>
          <a href={`/api/documents/${documentId}/export-docx`}>
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Word
            </Button>
          </a>
          <Link href={`/dashboard/documentos/${documentId}/imprimir`} target="_blank">
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </Link>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="contentHtml" value={contentHtml} readOnly />

        <div className="no-print grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="title">Título do documento</Label>
            <Input id="title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="contractNumber">Número do contrato</Label>
            <Input
              id="contractNumber"
              name="contractNumber"
              value={contractNumber}
              onChange={(event) => setContractNumber(event.target.value)}
              placeholder="Opcional"
            />
          </div>
          {documentType === "contract" && (
            <>
              <div>
                <Label htmlFor="classId">Turma / curso do contrato</Label>
                <Select
                  id="classId"
                  name="classId"
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                >
                  <option value="">Geral</option>
                  {classes.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="contractStartDate">Data início</Label>
                <Input
                  id="contractStartDate"
                  name="contractStartDate"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contractEndDate">Data término</Label>
                <Input
                  id="contractEndDate"
                  name="contractEndDate"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DocumentRichEditor initialHtml={contentHtml} onChange={setContentHtml} disabled={pending} />

        <div className="no-print flex flex-wrap items-center gap-2">
          <Button type="submit" name="status" value="draft" className="gap-2" disabled={pending}>
            <Save className="h-4 w-4" />
            Salvar rascunho
          </Button>
          <Button type="submit" name="status" value="final" variant="default" className="gap-2" disabled={pending}>
            <Save className="h-4 w-4" />
            Salvar e finalizar
          </Button>
        </div>
        {(importMessage || saveMessage) && (
          <p className="no-print text-sm text-slate-600">{importMessage || saveMessage}</p>
        )}
      </form>

      <form action={deleteStudentDocumentAction} className="no-print">
        <input type="hidden" name="documentId" value={documentId} />
        <Button type="submit" variant="outline" className="gap-2 text-red-600" disabled={pending}>
          <Trash2 className="h-4 w-4" />
          Excluir documento
        </Button>
      </form>
    </div>
  );
}
