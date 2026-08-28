import { getStudents, getClasses } from "@/lib/queries";
import { getSchoolSettings } from "@/lib/school-settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateStudentForm } from "@/components/forms/create-student-form";
import { formatStudentClasses } from "@/lib/student-enrollments";
import { StudentEnrollmentsManager } from "@/components/forms/student-enrollments-manager";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { UserIdentity } from "@/components/profile/user-identity";
import { InstitutionalSetupHint } from "@/components/school/institutional-setup-hint";
import { Users } from "lucide-react";
import { requirePageAccess, STAFF_ROLES } from "@/lib/access-control";
import { DeleteStudentButton } from "@/components/forms/delete-student-button";

export default async function AlunosPage() {
  const user = await requirePageAccess(STAFF_ROLES);

  const canManage =
    user.role === "admin" ||
    user.role === "director" ||
    user.role === "secretary" ||
    user.role === "teacher";
  const canManageSettings = user.role === "admin" || user.role === "director";
  const canDeleteStudents =
    user.role === "admin" || user.role === "director" || user.role === "secretary";

  const [students, classes, settings] = await Promise.all([
    getStudents(user.schoolId).catch(() => []),
    getClasses(user.schoolId).catch(() => []),
    getSchoolSettings(user.schoolId),
  ]);

  const classOptions = classes.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alunos"
        description="Cadastre alunos e matricule cada um em quantas turmas ou cursos forem necessários"
      >
        {canManage && <CreateStudentForm classes={classOptions} />}
      </PageHeader>

      {canManage && (
        <InstitutionalSetupHint
          canManageSettings={canManageSettings}
          classCount={classes.length}
          subjectCount={settings?.academic?.subjects?.length ?? 0}
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
                  <th className="pb-3 pr-4">Turmas / cursos</th>
                  <th className="pb-3 pr-4">Média</th>
                  <th className="pb-3 pr-4">Nível</th>
                  <th className="hidden pb-3 pr-4 lg:table-cell">XP</th>
                  <th className="pb-3 pr-4">Moedas</th>
                  {canDeleteStudents && <th className="pb-3">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const gradesList = student.grades ?? [];
                  const avg =
                    gradesList.length > 0
                      ? gradesList.reduce((s, g) => s + (g.value ?? 0), 0) / gradesList.length
                      : null;
                  return (
                    <tr key={student.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-mono text-xs">{student.enrollmentCode}</td>
                      <td className="max-w-[14rem] py-3 pr-4 sm:max-w-none">
                        <UserIdentity
                          name={student.user?.fullName ?? "Aluno"}
                          avatarUrl={student.user?.avatarUrl}
                          href={`/dashboard/alunos/${student.id}`}
                          subtitle={
                            formatStudentClasses(student.classEnrollments ?? [], student.classGroup) || undefined
                          }
                          size="xs"
                        />
                      </td>
                      <td className="hidden py-3 pr-4 text-slate-500 md:table-cell">
                        {student.user?.email ?? "-"}
                      </td>
                      <td className="py-3 pr-4">
                        {canManage ? (
                          <StudentEnrollmentsManager
                            studentId={student.id}
                            enrollments={(student.classEnrollments ?? []).map((item) => ({
                              classId: item.classId,
                              status: item.status,
                              classGroup: item.classGroup,
                            }))}
                            classes={classOptions}
                            compact
                          />
                        ) : (
                          formatStudentClasses(student.classEnrollments ?? [], student.classGroup)
                        )}
                      </td>
                      <td className="py-3 pr-4">{avg !== null && !isNaN(avg) ? avg.toFixed(1) : "-"}</td>
                      <td className="py-3 pr-4">
                        <Badge>Nv. {student.level ?? 1}</Badge>
                      </td>
                      <td className="hidden py-3 pr-4 text-indigo-600 lg:table-cell">
                        {(student.xpTotal ?? 0).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 text-amber-600">{student.coins ?? 0}</td>
                      {canDeleteStudents && (
                        <td className="py-3">
                          <DeleteStudentButton
                            studentId={student.id}
                            studentName={student.user?.fullName ?? "Aluno"}
                          />
                        </td>
                      )}
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
