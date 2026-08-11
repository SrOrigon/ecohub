import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reviewEnrollmentAction } from "@/actions/product-suite";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default async function MatriculasPage() {
  const user = await getSessionUser();
  if (!user?.schoolId) redirect("/login");
  if (!["admin", "director", "secretary"].includes(user.role)) redirect("/dashboard");

  const applications = await prisma.enrollmentApplication.findMany({
    where: { schoolId: user.schoolId },
    orderBy: { createdAt: "desc" },
    include: { reviewedBy: { select: { fullName: true } } },
  });

  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { slug: true, name: true } });

  return (
    <div className="space-y-6">
      <PageHeader title="Matrículas" description="Pipeline de inscrições online — aprove ou recuse candidatos.">
        {school?.slug ? (
          <a
            href={`/inscricao/${school.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 sm:w-auto"
          >
            Link público ↗
          </a>
        ) : null}
      </PageHeader>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-500">
            Nenhuma inscrição recebida ainda. Compartilhe o link público com as famílias.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{app.studentName}</p>
                    <Badge
                      variant={
                        app.status === "approved" ? "success" : app.status === "rejected" ? "danger" : "warning"
                      }
                    >
                      {app.status === "pending" ? "Pendente" : app.status === "approved" ? "Aprovada" : "Recusada"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Série: {app.gradeLevel} · Nasc.: {app.birthDate.toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-sm text-slate-600">
                    Responsável: {app.parentName} ({app.parentEmail})
                    {app.parentPhone ? ` · ${app.parentPhone}` : ""}
                  </p>
                  {app.notes && <p className="mt-2 text-sm text-slate-500">Obs.: {app.notes}</p>}
                  {app.reviewedBy && (
                    <p className="mt-1 text-xs text-slate-400">
                      Revisado por {app.reviewedBy.fullName} em {app.reviewedAt?.toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                {app.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <form action={reviewEnrollmentAction}>
                      <input type="hidden" name="applicationId" value={app.id} />
                      <input type="hidden" name="action" value="approve" />
                      <Button type="submit" size="sm" variant="default">
                        Aprovar
                      </Button>
                    </form>
                    <form action={reviewEnrollmentAction}>
                      <input type="hidden" name="applicationId" value={app.id} />
                      <input type="hidden" name="action" value="reject" />
                      <Button type="submit" size="sm" variant="outline">
                        Recusar
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
