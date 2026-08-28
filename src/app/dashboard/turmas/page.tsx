import { getClasses, getTeachers } from "@/lib/queries";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateClassForm } from "@/components/forms/create-class-form";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { UserIdentity } from "@/components/profile/user-identity";
import { GraduationCap } from "lucide-react";
import { ClassCoTeachersForm } from "@/components/forms/class-co-teachers-form";
import { requirePageAccess, STAFF_ROLES } from "@/lib/access-control";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { deleteClassAction } from "@/actions/crud";

export default async function TurmasPage() {
  const user = await requirePageAccess(STAFF_ROLES);

  const settings = await getSchoolSettings(user.schoolId);
  const isTeacher = user.role === "teacher";
  const canCreateClass =
    user.role === "admin" ||
    user.role === "director" ||
    (isTeacher && hasPermission(user.role, settings, "teacher.createClasses"));
  const canDeleteClass = user.role === "admin" || user.role === "director";

  const teacherFilter = isTeacher ? user.id : undefined;

  const [classes, teachers] = await Promise.all([
    getClasses(user.schoolId, teacherFilter).catch(() => []),
    user.role === "admin" || user.role === "director" ? getTeachers(user.schoolId).catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isTeacher ? "Minhas turmas" : "Turmas / cursos"}
        description={
          isTeacher
            ? "Cadastre turmas ou cursos e publique exercícios para todos os alunos de uma vez."
            : "Cadastre manualmente turmas, cursos e grupos  -  o Ecohub auxilia a partir daí."
        }
      >
        {canCreateClass && (
          <CreateClassForm teachers={teachers} teacherMode={isTeacher} allTeachers={teachers} />
        )}
      </PageHeader>

      {classes.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhuma turma cadastrada"
          description={
            isTeacher
              ? "Cadastre sua primeira turma para começar a publicar tarefas."
              : "Crie a primeira turma para começar a matricular alunos."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map((turma) => {
            const rosterMap = new Map<string, { id: string; user: { fullName: string; avatarUrl: string | null } }>();
            for (const student of turma.students) rosterMap.set(student.id, student);
            for (const enrollment of turma.enrollments ?? []) {
              rosterMap.set(enrollment.student.id, enrollment.student);
            }
            const roster = [...rosterMap.values()];
            const studentCount = roster.length;

            return (
            <Card key={turma.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle>{turma.name}</CardTitle>
                    {turma.teacher && (
                      <UserIdentity
                        name={turma.teacher.fullName}
                        avatarUrl={turma.teacher.avatarUrl}
                        subtitle={`${turma.gradeLevel}º ano · ${turma.year}`}
                        size="xs"
                        className="mt-2"
                      />
                    )}
                    {!turma.teacher && (
                      <p className="text-sm text-slate-500">
                        {turma.gradeLevel}º ano · {turma.year}
                        {!isTeacher && " · Prof. Não definido"}
                      </p>
                    )}
                    {turma.coTeachers && turma.coTeachers.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Co-docentes: {turma.coTeachers.map((ct) => ct.teacher?.fullName ?? "Prof.").join(", ")}
                      </p>
                    )}
                  </div>
                  {canDeleteClass && (
                    <DeleteConfirmButton
                      label="Excluir turma"
                      iconOnly
                      confirmMessage={`Excluir a turma "${turma.name}"? Os ${studentCount} aluno(s) serão desvinculados, mas não apagados. Esta ação não pode ser desfeita.`}
                      hiddenFields={{ classId: turma.id }}
                      action={deleteClassAction}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm font-medium">{studentCount} alunos matriculados</p>
                <ul className="space-y-2 text-sm text-slate-600">
                  {roster.map((a) => (
                    <li key={a.id}>
                      <UserIdentity
                        name={a.user.fullName}
                        avatarUrl={a.user.avatarUrl}
                        size="xs"
                      />
                    </li>
                  ))}
                </ul>
                {!isTeacher && teachers.length > 0 && (
                  <ClassCoTeachersForm
                    classId={turma.id}
                    className={turma.name}
                    primaryTeacherId={turma.teacher?.id ?? null}
                    currentCoTeacherIds={turma.coTeachers.map((ct) => ct.teacher.id)}
                    teachers={teachers}
                  />
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
