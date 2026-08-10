import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { createAuthorizationFormAction, signAuthorizationAction } from "@/actions/product-suite";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default async function AutorizacoesPage() {
  const user = await getSessionUser();
  if (!user?.schoolId) redirect("/login");

  const isStaff = ["admin", "director", "secretary", "teacher"].includes(user.role);
  const isParent = user.role === "parent";

  if (!isStaff && !isParent) redirect("/dashboard");

  const forms = isStaff
    ? await prisma.authorizationForm.findMany({
        where: { schoolId: user.schoolId },
        orderBy: { createdAt: "desc" },
        include: {
          classGroup: { select: { name: true } },
          _count: { select: { responses: true } },
        },
      })
    : await prisma.authorizationForm.findMany({
        where: { schoolId: user.schoolId },
        orderBy: { createdAt: "desc" },
        include: {
          responses: { where: { parentId: user.id } },
        },
      });

  const classes = isStaff
    ? await prisma.classGroup.findMany({
        where: { schoolId: user.schoolId },
        select: { id: true, name: true },
      })
    : [];

  const children = isParent
    ? await prisma.parentStudent.findMany({
        where: { parentId: user.id },
        include: { student: { include: { user: { select: { fullName: true } } } } },
      })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Autorizações"
        description="Formulários digitais para passeios, uso de imagem e consentimentos."
      />

      {isStaff && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <p className="font-semibold text-slate-800">Nova autorização</p>
            <form action={createAuthorizationFormAction} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" required placeholder="Ex.: Autorização passeio ao museu" />
              </div>
              <div>
                <Label htmlFor="classId">Turma (opcional)</Label>
                <Select id="classId" name="classId" defaultValue="">
                  <option value="">Toda a escola</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="deadline">Prazo (opcional)</Label>
                <Input id="deadline" name="deadline" type="date" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="body">Texto da autorização</Label>
                <Textarea id="body" name="body" rows={4} required placeholder="Descreva o evento e o consentimento..." />
              </div>
              <Button type="submit" className="w-fit">
                Publicar autorização
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {forms.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">Nenhuma autorização publicada.</CardContent>
          </Card>
        ) : (
          forms.map((form) => {
            const signed = isParent && "responses" in form && form.responses.length > 0;
            return (
              <Card key={form.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{form.title}</p>
                    {isStaff && "_count" in form && (
                      <Badge variant="secondary">{form._count.responses} assinatura(s)</Badge>
                    )}
                    {signed && <Badge variant="success">Você assinou</Badge>}
                  </div>
                  {"classGroup" in form && form.classGroup && (
                    <p className="text-sm text-slate-500">Turma: {form.classGroup.name}</p>
                  )}
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{form.body}</p>
                  {form.deadline && (
                    <p className="text-xs text-slate-500">
                      Prazo: {form.deadline.toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  {isParent && !signed && (
                    <form action={signAuthorizationAction} className="space-y-2 border-t pt-3">
                      <input type="hidden" name="formId" value={form.id} />
                      {children.length > 0 && (
                        <div>
                          <Label htmlFor={`student-${form.id}`}>Filho(a)</Label>
                          <Select id={`student-${form.id}`} name="studentId" defaultValue={children[0]?.studentId}>
                            {children.map((c) => (
                              <option key={c.studentId} value={c.studentId}>
                                {c.student.user.fullName}
                              </option>
                            ))}
                          </Select>
                        </div>
                      )}
                      <Button type="submit" size="sm">
                        Assinar digitalmente
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
