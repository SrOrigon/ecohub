import { getSessionUser } from "@/lib/auth";
import { getGrades, getStudents } from "@/lib/queries";
import { getSchoolSettings } from "@/lib/school-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateGradeForm } from "@/components/forms/create-grade-form";
import { GradeRowActions } from "@/components/forms/grade-row-actions";
import { ConfigureSubjectsPrompt } from "@/components/school/configure-subjects-prompt";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";

export default async function NotasPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "student") redirect("/dashboard/aluno");

  const canManage = user.role === "admin" || user.role === "director" || user.role === "teacher";
  const canManageSettings = user.role === "admin" || user.role === "director";

  const [grades, students, settings] = await Promise.all([
    getGrades(user.schoolId),
    getStudents(user.schoolId),
    getSchoolSettings(user.schoolId),
  ]);

  const hasSubjects = settings.academic.subjects.length > 0;

  const studentOptions = students.map((s) => ({
    id: s.id,
    name: s.user.fullName,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notas"
        description={`Lançamento manual com disciplinas da instituição (${settings.academic.subjects.length} cadastradas · ${settings.xp.perGradePoint} XP/ponto · bônus ≥${settings.xp.gradeBonusThreshold})`}
      >
        {canManage && hasSubjects && (
          <CreateGradeForm
            students={studentOptions}
            subjects={settings.academic.subjects}
            periods={settings.academic.periods}
            maxGrade={settings.academic.maxGrade}
          />
        )}
      </PageHeader>

      {canManage && !hasSubjects && (
        <ConfigureSubjectsPrompt canManage={canManageSettings} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notas lançadas ({grades.length})</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {grades.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nenhuma nota lançada"
              description="Use o botão acima para registrar a primeira nota."
            />
          ) : (
            <ResponsiveTable minWidth="40rem" caption="Notas lançadas na escola">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th scope="col" className="pb-3 pr-4">Aluno</th>
                  <th scope="col" className="pb-3 pr-4">Disciplina</th>
                  <th scope="col" className="hidden pb-3 pr-4 sm:table-cell">Período</th>
                  <th scope="col" className="hidden pb-3 pr-4 md:table-cell">Data</th>
                  <th scope="col" className="pb-3">Nota</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((grade) => (
                  <tr key={grade.id} className="border-b border-slate-100">
                    <td className="max-w-[8rem] py-3 pr-4 sm:max-w-none">{grade.student.user.fullName}</td>
                    <td className="py-3 pr-4">{grade.subject}</td>
                    <td className="hidden py-3 pr-4 sm:table-cell">{grade.period}</td>
                    <td className="hidden py-3 pr-4 md:table-cell">
                      {grade.createdAt.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3">
                      {canManage ? (
                        <GradeRowActions
                          gradeId={grade.id}
                          value={grade.value}
                          maxGrade={settings.academic.maxGrade}
                          passGrade={settings.academic.passGrade}
                        />
                      ) : (
                        <span>{grade.value.toFixed(1)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
