import { getSessionUser } from "@/lib/auth";
import { getStudents, getClasses } from "@/lib/queries";
import { getSchoolSettings } from "@/lib/school-settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateStudentForm } from "@/components/forms/create-student-form";
import { StudentClassSelect } from "@/components/forms/student-class-select";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { UserIdentity } from "@/components/profile/user-identity";
import { InstitutionalSetupHint } from "@/components/school/institutional-setup-hint";
import { Users } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AlunosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "student") redirect("/dashboard/aluno");

  const canManage =
    user.role === "admin" ||
    user.role === "director" ||
    user.role === "secretary" ||
    user.role === "teacher";
  const canManageSettings = user.role === "admin" || user.role === "director";

  const [students, classes, settings] = await Promise.all([
    getStudents(user.schoolId),
    getClasses(user.schoolId),
    getSchoolSettings(user.schoolId),
  ]);

  const classOptions = classes.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alunos"
        description="Cadastre alunos manualmente e vincule cada um à turma ou curso da instituição"
      >
        {canManage && <CreateStudentForm classes={classOptions} />}
      </PageHeader>

      {canManage && (
        <InstitutionalSetupHint
          canManageSettings={canManageSettings}
          classCount={classes.length}
          subjectCount={settings.academic.subjects.length}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de alunos ({students.length})</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum aluno cadastrado"
              description="Cadastre o primeiro aluno e depois associe-o a uma turma ou curso."
            />
          ) : (
            <ResponsiveTable minWidth="36rem">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 pr-4">Matrícula</th>
                  <th className="pb-3 pr-4">Nome</th>
                  <th className="hidden pb-3 pr-4 md:table-cell">E-mail</th>
                  <th className="pb-3 pr-4">Turma / curso</th>
                  <th className="pb-3 pr-4">Média</th>
                  <th className="pb-3 pr-4">Nível</th>
                  <th className="hidden pb-3 pr-4 lg:table-cell">XP</th>
                  <th className="pb-3">Moedas</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const avg =
                    student.grades.length > 0
                      ? student.grades.reduce((s, g) => s + g.value, 0) / student.grades.length
                      : null;
                  return (
                    <tr key={student.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-mono text-xs">{student.enrollmentCode}</td>
                      <td className="max-w-[14rem] py-3 pr-4 sm:max-w-none">
                        <UserIdentity
                          name={student.user.fullName}
                          avatarUrl={student.user.avatarUrl}
                          href={`/dashboard/alunos/${student.id}`}
                          subtitle={student.classGroup?.name ?? undefined}
                          size="xs"
                        />
                      </td>
                      <td className="hidden py-3 pr-4 text-slate-500 md:table-cell">
                        {student.user.email}
                      </td>
                      <td className="py-3 pr-4">
                        {canManage ? (
                          <StudentClassSelect
                            studentId={student.id}
                            currentClassId={student.classId}
                            classes={classOptions}
                          />
                        ) : (
                          student.classGroup?.name ?? "-"
                        )}
                      </td>
                      <td className="py-3 pr-4">{avg !== null ? avg.toFixed(1) : "-"}</td>
                      <td className="py-3 pr-4">
                        <Badge>Nv. {student.level}</Badge>
                      </td>
                      <td className="hidden py-3 pr-4 text-indigo-600 lg:table-cell">
                        {student.xpTotal.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 text-amber-600">{student.coins}</td>
                    </tr>
                  );
                })}
              </tbody>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
