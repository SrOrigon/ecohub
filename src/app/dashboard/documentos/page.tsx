import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { issueDocumentAction } from "@/actions/product-suite";
import { redirect } from "next/navigation";

export default async function DocumentosPage() {
  const user = await getSessionUser();
  if (!user?.schoolId) redirect("/login");
  if (!["admin", "director", "secretary"].includes(user.role)) redirect("/dashboard");

  const [students, documents] = await Promise.all([
    prisma.student.findMany({
      where: { user: { schoolId: user.schoolId } },
      include: { user: { select: { fullName: true } } },
      orderBy: { user: { fullName: "asc" } },
    }),
    prisma.issuedDocument.findMany({
      where: { schoolId: user.schoolId },
      orderBy: { issuedAt: "desc" },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        issuedBy: { select: { fullName: true } },
      },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Documentos" description="Declarações, certificados e atestados emitidos pela escola." />

      <Card>
        <CardContent className="space-y-4 p-4">
          <p className="font-semibold">Emitir documento</p>
          <form action={issueDocumentAction} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="studentId">Aluno</Label>
              <Select id="studentId" name="studentId" required>
                <option value="">Selecione...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.user.fullName}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" name="type" defaultValue="declaration">
                <option value="declaration">Declaração</option>
                <option value="certificate">Certificado</option>
                <option value="transfer">Transferência</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" required placeholder="Ex.: Declaração de matrícula" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="body">Conteúdo</Label>
              <Textarea
                id="body"
                name="body"
                rows={5}
                required
                placeholder="Texto do documento..."
                defaultValue="Declaramos, para os devidos fins, que o(a) aluno(a) encontra-se regularmente matriculado(a) nesta instituição."
              />
            </div>
            <Button type="submit" className="w-fit">
              Emitir
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Documentos recentes</h2>
        {documents.length === 0 ? (
          <p className="text-slate-500">Nenhum documento emitido ainda.</p>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <p className="font-medium">{doc.title}</p>
                <p className="text-sm text-slate-600">
                  {doc.student.user.fullName} · {doc.issuedAt.toLocaleDateString("pt-BR")} · por {doc.issuedBy.fullName}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{doc.body}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
