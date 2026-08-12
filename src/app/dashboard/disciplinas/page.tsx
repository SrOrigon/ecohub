import { getSessionUser } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectsManagerForm } from "@/components/school/subjects-manager-form";
import { redirect } from "next/navigation";

export default async function DisciplinasPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "director", "secretary"].includes(user.role)) redirect("/dashboard");

  const settings = await getSchoolSettings(user.schoolId);
  const canManage = user.role === "admin" || user.role === "director";

  const subjects = settings?.academic?.subjects ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disciplinas"
        description="Cadastre manualmente as matérias da instituição. O EduHub usa somente esta lista em notas, horários, diário, boletim e exercícios."
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {subjects.length === 0
              ? "Nenhuma disciplina cadastrada"
              : `${subjects.length} disciplina(s) ativa(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SubjectsManagerForm
            initialSubjects={subjects}
            readOnly={!canManage}
          />
          {!canManage && (
            <p className="mt-4 text-sm text-slate-500">
              Apenas direção pode alterar disciplinas. Você pode visualizar a lista atual.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
