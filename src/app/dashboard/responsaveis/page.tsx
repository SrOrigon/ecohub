import { getSessionUser } from "@/lib/auth";
import { fetchParentsForSchool } from "@/lib/reads/parent-reads";
import { getStudents } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateParentForm } from "@/components/forms/create-parent-form";
import { LinkParentForm } from "@/components/forms/link-parent-form";
import { UnlinkParentButton } from "@/components/forms/unlink-parent-button";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { UserIdentity } from "@/components/profile/user-identity";
import { Heart } from "lucide-react";
import { redirect } from "next/navigation";

const relationLabels: Record<string, string> = {
  mae: "Mãe",
  pai: "Pai",
  responsavel: "Responsável",
  avo: "Avô/Avó",
};

export default async function ResponsaveisPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "director") redirect("/dashboard");

  const [parents, students] = await Promise.all([
    fetchParentsForSchool(user, user.schoolId),
    getStudents(user.schoolId),
  ]);

  const studentOptions = students.map((s) => ({ id: s.id, name: s.user.fullName }));
  const parentOptions = parents.map((p) => ({ id: p.id, name: p.fullName }));

  return (
    <div className="space-y-6">
      <PageHeader title="Responsáveis" description="Cadastre pais/responsáveis e vincule aos alunos">
        <LinkParentForm parents={parentOptions} students={studentOptions} />
        <CreateParentForm students={studentOptions} />
      </PageHeader>

      <div className="grid gap-4">
        {parents.map((parent) => (
          <Card key={parent.id}>
            <CardHeader>
              <UserIdentity
                name={parent.fullName}
                avatarUrl={parent.avatarUrl}
                subtitle={parent.email}
                size="md"
              />
            </CardHeader>
            <CardContent>
              {parent.parentLinks.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum filho vinculado</p>
              ) : (
                <ul className="space-y-2">
                  {parent.parentLinks.map((link) => (
                    <li key={link.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <UserIdentity
                        name={link.student.user.fullName}
                        avatarUrl={link.student.user.avatarUrl}
                        subtitle={`${relationLabels[link.relation] ?? link.relation}${link.student.classGroup ? ` · ${link.student.classGroup.name}` : ""}`}
                        size="xs"
                        className="min-w-0 flex-1"
                      />
                      <UnlinkParentButton
                        linkId={link.id}
                        studentName={link.student.user.fullName}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {parents.length === 0 && (
        <EmptyState
          icon={Heart}
          title="Nenhum responsável cadastrado"
          description='Use "+ Novo responsável" para começar.'
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Conta demo de responsável</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <p>Após rodar <code className="rounded bg-slate-100 px-1">npm run db:seed</code>:</p>
          <p className="mt-1"><Badge>mariana@responsavel.local</Badge> / demo123 — vinculada a Lucas e Ana</p>
        </CardContent>
      </Card>
    </div>
  );
}
