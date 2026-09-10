import { getStudents, getClasses } from "@/lib/queries";
import { getSchoolSettings } from "@/lib/school-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateStudentForm } from "@/components/forms/create-student-form";
import { PageHeader } from "@/components/layout/page-header";
import { StudentsListPanel } from "@/components/students/students-list-panel";
import { InstitutionalSetupHint } from "@/components/school/institutional-setup-hint";
import { requirePageAccess, STAFF_ROLES } from "@/lib/access-control";

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

  const studentRows = students.map((student) => {
    const gradesList = student.grades ?? [];
    const average =
      gradesList.length > 0
        ? gradesList.reduce((sum, grade) => sum + (grade.value ?? 0), 0) / gradesList.length
        : null;

    return {
      id: student.id,
      enrollmentCode: student.enrollmentCode ?? "",
      fullName: student.user?.fullName ?? "Aluno",
      email: student.user?.email ?? null,
      avatarUrl: student.user?.avatarUrl ?? null,
      level: student.level ?? 1,
      xpTotal: student.xpTotal ?? 0,
      coins: student.coins ?? 0,
      average,
      enrollments: (student.classEnrollments ?? []).map((item) => ({
        classId: item.classId,
        status: item.status,
        classGroup: item.classGroup,
      })),
    };
  });

  return (
    <div className="space-y-4 md:space-y-6">
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
          <StudentsListPanel
            students={studentRows}
            classes={classOptions}
            canManage={canManage}
            canDeleteStudents={canDeleteStudents}
          />
        </CardContent>
      </Card>
    </div>
  );
}
