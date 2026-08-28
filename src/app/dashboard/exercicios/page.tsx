import { getExercisesForUser, getTeacherClasses } from "@/lib/exercises";
import { getSchoolSettings } from "@/lib/school-settings";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { CreateExerciseForm } from "@/components/forms/create-exercise-form";
import { StudentExercisesList } from "@/components/exercises/student-exercises-list";
import { TeacherExercisesList } from "@/components/exercises/teacher-exercises-list";
import { TeacherExerciseStats } from "@/components/exercises/teacher-exercise-stats";
import { ConfigureSubjectsPrompt } from "@/components/school/configure-subjects-prompt";
import { ClipboardCheck, PenLine } from "lucide-react";
import { requirePageAccess } from "@/lib/access-control";

export default async function ExerciciosPage() {
  const user = await requirePageAccess(["admin", "director", "teacher", "student"]);

  const isStaff = user.role === "admin" || user.role === "director" || user.role === "teacher";
  const canManageSettings = user.role === "admin" || user.role === "director";
  const [exercises, classes, settings] = await Promise.all([
    getExercisesForUser(user),
    isStaff ? getTeacherClasses(user) : Promise.resolve([]),
    getSchoolSettings(user.schoolId),
  ]);

  const pendingGrades = isStaff
    ? exercises.reduce(
        (n, ex) => n + ex.submissions.filter((s) => s.status === "submitted").length,
        0
      )
    : 0;
  const activeCount = exercises.filter((ex) => ex.isActive).length;

  const hasSubjects = settings.academic.subjects.length > 0;

  const description =
    user.role === "student"
      ? "Veja o que falta fazer, acompanhe correções e ganhe XP"
      : pendingGrades > 0
        ? `${pendingGrades} entrega(s) aguardando sua correção`
        : "Publique atividades, acompanhe entregas e corrija com um clique";

  return (
    <div className="space-y-6">
      <PageHeader title="Exercícios" description={description}>
        {isStaff && classes.length > 0 && hasSubjects && (
          <CreateExerciseForm
            classes={classes}
            presets={settings.exercises.presets}
            subjects={settings.academic.subjects}
          />
        )}
      </PageHeader>

      {isStaff && !hasSubjects && (
        <ConfigureSubjectsPrompt canManage={canManageSettings} />
      )}

      {isStaff && exercises.length > 0 && (
        <TeacherExerciseStats
          total={exercises.length}
          pendingGrades={pendingGrades}
          active={activeCount}
        />
      )}

      {exercises.length === 0 ? (
        <EmptyState
          icon={PenLine}
          title={isStaff ? "Nenhum exercício publicado" : "Nenhum exercício disponível"}
          description={
            isStaff
              ? "Clique em Publicar atividade, selecione um ou mais alunos e envie o exercício só para eles."
              : "Quando o professor publicar, aparecerá aqui com XP e moedas para ganhar!"
          }
        />
      ) : user.role === "student" ? (
        <StudentExercisesList exercises={exercises} />
      ) : (
        <TeacherExercisesList exercises={exercises} />
      )}

      {isStaff && (
        <Card className="border-indigo-100 bg-indigo-50/50">
          <CardContent className="flex items-start gap-3 py-4">
            <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
            <div className="text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Regras da escola</p>
              <p className="mt-1">
                Auto-correção {settings.exercises.autoGradeEnabled ? "ligada" : "desligada"}
                {" · "}
                Boletim {settings.exercises.postGradeToBulletin ? "recebe nota" : "não recebe nota"}
                {" · "}
                Use &quot;Aplicar gabarito&quot; nas respostas abertas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
