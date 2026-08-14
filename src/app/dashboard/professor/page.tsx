import { prisma } from "@/lib/db";
import { getRanking } from "@/lib/queries";
import { getExerciseSummariesForTeacher, getTeacherClasses } from "@/lib/exercises";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";
import { SchoolCalendarWidget } from "@/components/school/school-calendar-widget";
import { TodayAgendaWidget } from "@/components/school/today-agenda-widget";
import { getTodayAgendaForTeacher } from "@/lib/today-agenda";
import { CreateClassForm } from "@/components/forms/create-class-form";
import { CreateExerciseForm } from "@/components/forms/create-exercise-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserIdentity } from "@/components/profile/user-identity";
import { RankingList } from "@/components/profile/ranking-list";
import { TeacherDayOverview } from "@/components/teacher/teacher-day-overview";
import { BulkCompleteMissionsForm } from "@/components/forms/bulk-complete-missions-form";
import { getTeacherDayOverview } from "@/lib/teacher-day";
import { getPendingMissionConfirmations } from "@/lib/mission-requests";
import { teacherClassWhere } from "@/lib/teacher-classes";
import { BookOpen, ClipboardList, Users, Medal, PenLine, AlertCircle, Settings2 } from "lucide-react";
import { requireSchoolPageAccess } from "@/lib/access-control";

export default async function TeacherDashboardPage() {
  const user = await requireSchoolPageAccess(["teacher"]);

  const myClasses = await prisma.classGroup.findMany({
    where: { schoolId: user.schoolId, ...teacherClassWhere(user.id) },
    select: {
      id: true,
      name: true,
      students: {
        select: {
          id: true,
          level: true,
          user: { select: { fullName: true, avatarUrl: true } },
        },
      },
      _count: { select: { students: true } },
    },
  });

  const classIds = myClasses.map((c) => c.id);
  const classGradeAvgs =
    classIds.length > 0
      ? await prisma.grade.findMany({
          where: { student: { classId: { in: classIds } } },
          select: { value: true, student: { select: { classId: true } } },
        })
      : [];

  const mediaByClass = new Map<string, number>();
  for (const classId of classIds) {
    const values = classGradeAvgs
      .filter((g) => g.student.classId === classId)
      .map((g) => g.value)
      .filter((v): v is number => typeof v === "number" && !isNaN(v));
    mediaByClass.set(
      classId,
      values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
    );
  }

  const totalStudents = myClasses.reduce((s, c) => s + c._count.students, 0);
  const [ranking, exercises, settings, agenda, teacherClasses, dayOverview, pendingMissions] = await Promise.all([
    getRanking(user.schoolId, undefined, 5).catch(() => []),
    getExerciseSummariesForTeacher(user).catch(() => []),
    getSchoolSettings(user.schoolId).catch(() => ({ academic: { subjects: [] }, xp: {}, exercises: {}, missions: {} } as unknown as Awaited<ReturnType<typeof getSchoolSettings>>)),
    getTodayAgendaForTeacher(user, user.schoolId).catch(() => ({ items: [], dayStatus: null, classCount: 0 })),
    getTeacherClasses(user).catch(() => []),
    user.schoolId ? getTeacherDayOverview(user.schoolId, user.id).catch(() => []) : Promise.resolve([]),
    user.schoolId ? getPendingMissionConfirmations(user.schoolId, user.id).catch(() => []) : Promise.resolve([]),
  ]);

  const pendingItems = pendingMissions.map((pm) => ({
    studentId: pm.studentId,
    missionId: pm.missionId,
    studentName: pm.student.user.fullName,
    className: pm.student.classGroup?.name ?? null,
    missionTitle: pm.mission.title,
    xpReward: pm.mission.xpReward,
    coinReward: pm.mission.coinReward,
  }));

  const canCreateClass = hasPermission(user.role, settings, "teacher.createClasses");

  const pendingGrades = exercises.reduce(
    (n, ex) => n + ex.submissions.filter((s) => s.status === "submitted").length,
    0
  );
  const pendingExercises = exercises.filter((ex) =>
    ex.submissions.some((s) => s.status === "submitted")
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel do Professor"
        description={`Olá, ${user.fullName}! Cadastre turmas e publique tarefas para todos os alunos.`}
      >
        <div className="flex flex-wrap gap-2">
          {canCreateClass && <CreateClassForm teacherMode />}
          {teacherClasses.length > 0 && settings.academic.subjects.length > 0 && (
            <CreateExerciseForm
              classes={teacherClasses}
              presets={settings.exercises.presets}
              subjects={settings.academic.subjects}
            />
          )}
        </div>
      </PageHeader>

      <Card className="border-slate-200 bg-slate-50/80">
        <CardContent className="flex flex-wrap items-start gap-3 py-4">
          <Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden="true" />
          <div className="text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Regras ativas da escola</p>
            <p className="mt-1">
              {settings.xp.perGradePoint} XP/ponto de nota
              {" · "}
              presença +{settings.xp.attendancePresent} XP
              {" · "}
              auto-correção {settings.exercises.autoGradeEnabled ? "ligada" : "off"}
              {" · "}
              missões padrão {settings.missions.defaultXp} XP / {settings.missions.defaultCoins} moedas
            </p>
          </div>
        </CardContent>
      </Card>

      <SchoolCalendarWidget settings={settings} compact />

      <TodayAgendaWidget
        items={agenda.items}
        dayStatus={agenda.dayStatus}
        title="Sua agenda de hoje"
        subtitle={`${agenda.classCount} turma(s) · ${agenda.items.filter((i) => !i.done).length} pendência(s)`}
      />

      <TeacherDayOverview classes={dayOverview} />

      {pendingItems.length > 0 && (
        <Card className="border-indigo-200">
          <CardHeader>
            <CardTitle className="text-lg">Missões aguardando confirmação</CardTitle>
          </CardHeader>
          <CardContent>
            <BulkCompleteMissionsForm items={pendingItems} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Minhas turmas</CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{myClasses.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Total de alunos</CardTitle>
            <BookOpen className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalStudents}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Ações rápidas</CardTitle>
            <ClipboardList className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/dashboard/notas"><Button size="sm" variant="outline">Lançar nota</Button></Link>
            <Link href="/dashboard/frequencia"><Button size="sm" variant="outline">Frequência</Button></Link>
            <Link href="/dashboard/exercicios"><Button size="sm" variant="outline">Exercícios</Button></Link>
          </CardContent>
        </Card>
      </div>

      {pendingGrades > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" aria-hidden="true" />
              {pendingGrades} entrega(s) aguardando correção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingExercises.slice(0, 5).map((ex) => {
              const pending = ex.submissions.filter((s) => s.status === "submitted").length;
              return (
                <div key={ex.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3">
                  <div>
                    <p className="font-medium text-slate-900">{ex.title}</p>
                    <p className="text-sm text-slate-500">
                      {ex.classGroup?.name} · {pending} aluno(s)
                    </p>
                  </div>
                  <Link href={`/dashboard/exercicios/${ex.id}`}>
                    <Button size="sm" className="gap-1">
                      <PenLine className="h-4 w-4" aria-hidden="true" />
                      Corrigir
                    </Button>
                  </Link>
                </div>
              );
            })}
            <Link href="/dashboard/exercicios">
              <Button variant="outline" size="sm">Ver todos os exercícios</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {myClasses.map((turma) => {
          const media = mediaByClass.get(turma.id) ?? 0;
          return (
            <Card key={turma.id}>
              <CardHeader>
                <CardTitle>{turma.name}</CardTitle>
                <p className="text-sm text-slate-500">{turma._count.students} alunos · Média {media.toFixed(1)}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {turma.students.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2">
                      <UserIdentity
                        name={s.user.fullName}
                        avatarUrl={s.user.avatarUrl}
                        href={`/dashboard/alunos/${s.id}`}
                        size="xs"
                        className="min-w-0 flex-1"
                      />
                      <Badge variant="default" className="shrink-0">Nv. {s.level}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {myClasses.length === 0 && (
        <EmptyState
          title="Nenhuma turma ainda"
          description="Cadastre sua primeira turma acima. Depois publique exercícios e toda a turma recebe de uma vez."
        />
      )}

      <Card>
        <CardHeader><CardTitle>Ranking da escola</CardTitle></CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <EmptyState
              icon={Medal}
              title="Ranking indisponível"
              description="Ainda não há alunos com XP na escola."
              className="py-6"
            />
          ) : (
            <RankingList items={ranking} showClass={false} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
