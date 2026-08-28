import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Badge } from "@/components/ui/badge";
import { createStudentDocumentAction } from "@/actions/student-documents";
import { DOCUMENT_TYPES, documentStatusLabel, documentTypeLabel } from "@/lib/document-types";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string; q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user?.schoolId) redirect("/login");
  if (!["admin", "director", "secretary"].includes(user.role)) redirect("/dashboard");

  const params = await searchParams;
  const studentFilter = params.aluno?.trim();
  const query = params.q?.trim().toLowerCase();

  const [students, documents] = await Promise.all([
    prisma.student.findMany({
      where: { user: { schoolId: user.schoolId } },
      include: { user: { select: { fullName: true } }, classGroup: { select: { name: true } } },
      orderBy: { user: { fullName: "asc" } },
    }),
    prisma.issuedDocument.findMany({
      where: {
        schoolId: user.schoolId,
        ...(studentFilter ? { studentId: studentFilter } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        issuedBy: { select: { fullName: true } },
      },
      take: 200,
    }),
  ]);

  const filteredDocuments = query
    ? documents.filter((doc) => {
        const haystack = [
          doc.title,
          doc.contractNumber ?? "",
          doc.student.user.fullName,
          documentTypeLabel(doc.type),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
    : documents;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos e contratos"
        description="Crie, edite e imprima documentos individuais por aluno. Tudo fica salvo no banco de dados da instituição."
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-600" />
            <p className="font-semibold">Novo documento para aluno</p>
          </div>
          <form action={createStudentDocumentAction} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="studentId">Aluno</Label>
              <Select id="studentId" name="studentId" required defaultValue={studentFilter ?? ""}>
                <option value="">Selecione...</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.user.fullName}
                    {student.classGroup?.name ? ` · ${student.classGroup.name}` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" name="type" defaultValue="contract">
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" placeholder="Ex.: Contrato de prestação de serviço" />
            </div>
            <Button type="submit" className="w-fit gap-2">
              <FileText className="h-4 w-4" />
              Criar e abrir editor
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <form className="flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1">
              <Label htmlFor="q">Buscar</Label>
              <Input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Título, aluno ou número..." />
            </div>
            <div className="min-w-[12rem] flex-1">
              <Label htmlFor="aluno">Filtrar por aluno</Label>
              <Select id="aluno" name="aluno" defaultValue={studentFilter ?? ""}>
                <option value="">Todos</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.user.fullName}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Documentos ({filteredDocuments.length})</h2>
        {filteredDocuments.length === 0 ? (
          <p className="text-slate-500">Nenhum documento encontrado.</p>
        ) : (
          filteredDocuments.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{doc.title}</p>
                    <Badge variant="secondary">{documentTypeLabel(doc.type)}</Badge>
                    <Badge variant={doc.status === "final" ? "success" : "warning"}>
                      {documentStatusLabel(doc.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {doc.student.user.fullName}
                    {doc.contractNumber ? ` · Contrato ${doc.contractNumber}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    Atualizado em {formatDate(doc.updatedAt)} · por {doc.issuedBy.fullName}
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
