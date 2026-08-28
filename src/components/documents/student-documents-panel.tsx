import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { createStudentDocumentAction } from "@/actions/student-documents";
import { Label, Select } from "@/components/ui/form-fields";
import { documentStatusLabel, documentTypeLabel } from "@/lib/document-types";
import { formatDate } from "@/lib/utils";
import { FileText, Plus } from "lucide-react";

export async function StudentDocumentsPanel({ studentId, schoolId }: { studentId: string; schoolId: string }) {
  const documents = await prisma.issuedDocument.findMany({
    where: { schoolId, studentId },
    orderBy: { updatedAt: "desc" },
    include: { issuedBy: { select: { fullName: true } } },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo documento / contrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createStudentDocumentAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="studentId" value={studentId} />
            <div className="min-w-[12rem]">
              <Label htmlFor={`doc-type-${studentId}`}>Tipo</Label>
              <Select id={`doc-type-${studentId}`} name="type" defaultValue="contract">
                <option value="contract">Contrato</option>
                <option value="declaration">Declaração</option>
                <option value="certificate">Certificado</option>
                <option value="transfer">Transferência</option>
                <option value="other">Outro</option>
              </Select>
            </div>
            <Button type="submit" className="gap-2">
              <FileText className="h-4 w-4" />
              Criar documento
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos do aluno ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum documento"
              description="Crie contratos, declarações e outros documentos individuais para este aluno."
              className="py-8"
            />
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{doc.title}</p>
                    <Badge variant="secondary">{documentTypeLabel(doc.type)}</Badge>
                    <Badge variant={doc.status === "final" ? "success" : "warning"}>
                      {documentStatusLabel(doc.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {doc.contractNumber ? `Contrato ${doc.contractNumber} · ` : ""}
                    Atualizado em {formatDate(doc.updatedAt)} · {doc.issuedBy.fullName}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/documentos/${doc.id}`}>
                    <Button size="sm">Editar</Button>
                  </Link>
                  <Link href={`/dashboard/documentos/${doc.id}/imprimir`} target="_blank">
                    <Button size="sm" variant="outline">
                      Imprimir
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
