import Link from "next/link";
import { Gift, Star, Trophy, Coins, FileText, PenLine, ChevronRight, History } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRanking, getMissionsForStudent } from "@/lib/queries";
import { getExercisesForUser } from "@/lib/exercises";
import { getXpProgress } from "@/lib/gamification";
import { getSchoolSettings } from "@/lib/school-settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  ExerciseRewardPills,
  getStudentExerciseStatus,
} from "@/components/exercises/exercise-status-badge";
import { RequestMissionButton } from "@/components/forms/request-mission-button";
import { type TodayItem } from "@/components/student/today-checklist";
import { TodayAgendaWidget } from "@/components/school/today-agenda-widget";
import { getTodayAgendaForStudent } from "@/lib/today-agenda";
import { getHomeTasksForStudent } from "@/actions/home-tasks";
import { StudentHomeTasksList } from "@/components/home-tasks/student-home-tasks-list";
import { SchoolCalendarWidget } from "@/components/school/school-calendar-widget";
import { LiveStudentStatsCard } from "@/components/metrics/live-activity-feed";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function AlunoPortalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/dashboard");

  const student = await prisma.student.findFirst({
    where: { userId: user.id },
    include: {
      classGroup: true,
      grades: { orderBy: { createdAt: "desc" } },
      studentMissions: { include: { mission: true } },
      studentBadges: { include: { badge: true } },
      xpTransactions: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!student) {
    return (
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-lg" role="alert">
        <p>Perfil de aluno não encontrado. Peça ajuda à secretaria da escola.</p>
      </div>
    );
  }

  const [schoolRanking, classRanking, missions, exercises, settings, agenda, homeTasks] = await Promise.all([
    getRanking(user.schoolId).catch(() => []),
    getRanking(user.schoolId, student.classId).catch(() => []),
    getMissionsForStudent(user.schoolId, student.classId).catch(() => []),
    getExercisesForUser(user).catch(() => []),
    getSchoolSettings(user.schoolId).catch(() => ({ xp: { xpPerLevel: 1000 } } as any)),
    getTodayAgendaForStudent(student.id, student.classId, user.schoolId, user).catch(() => ({ items: [], dayStatus: null })),
    getHomeTasksForStudent(student.id).catch(() => []),
  ]);

  const enrichedExercises = exercises.map((ex) => {
    const sub = ex.submissions[0];
    const status = getStudentExerciseStatus(sub, ex.dueDate, !!sub);
    return { ...ex, sub, status };
  });

  const pendingExercises = enrichedExercises.filter((ex) => ex.status === "pending").slice(0, 3);
  const waitingGrade = enrichedExercises.filter((ex) => ex.status === "submitted").length;

  const openMissions = missions.filter(
    (mission) =>
      !student.studentMissions.some((sm) => sm.missionId === mission.id && sm.completedAt)
  );

  const todayItems: TodayItem[] = [
    ...pendingExercises.map((ex) => ({
      id: `ex-${ex.id}`,
      title: ex.title,
      subtitle: ex.dueDate ? `Prazo: ${formatDate(ex.dueDate)}` : "Exercício / prova",
      href: `/dashboard/exercicios/${ex.id}`,
      done: false,
      cta: "Responder",
      badge: `+${ex.xpReward} XP`,
    })),
    ...openMissions.slice(0, 3).map((m) => ({
      id: `mission-${m.id}`,
      title: m.title,
      subtitle: "Missão da turma",
      href: "#missoes",
      done: false,
      cta: "Ver missão",
      badge: `+${m.xpReward} XP`,
    })),
  ];

  if (todayItems.length === 0 && waitingGrade > 0) {
    todayItems.push({
      id: "waiting",
      title: `${waitingGrade} atividade(s) aguardando correção`,
      subtitle: "Você já enviou — agora é com o professor",
      href: "/dashboard/exercicios",
      done: true,
      cta: "Ver",
    });
  }

  const mySchoolRank = schoolRanking.find((r) => r.id === student.id);
  const myClassRank = classRanking.find((r) => r.id === student.id);
  const avgGrade =
    student.grades.length > 0
      ? student.grades.reduce((s, g) => s + g.value, 0) / student.grades.length
      : 0;

  const { percent: xpProgress, xpForNextLevel } = getXpProgress(
    student.xpTotal,
    settings.xp.xpPerLevel
  );
  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Olá, ${firstName}!`}
        description={`${student.classGroup?.name ?? "Sem turma"} · Matrícula ${student.enrollmentCode}`}
      >
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href={`/dashboard/alunos/${student.id}/boletim`} className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
              <FileText className="h-5 w-5" aria-hidden="true" />
              Meu boletim
            </Button>
          </Link>
          <Link href="/dashboard/aluno/historico" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
              <History className="h-5 w-5" aria-hidden="true" />
              Meu histórico
            </Button>
          </Link>
          <Link href="/dashboard/rankings" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
              <Trophy className="h-5 w-5" aria-hidden="true" />
              Rankings
            </Button>
          </Link>
          <Link href="/dashboard/loja" className="w-full sm:w-auto">
            <Button size="lg" className="w-full gap-2 sm:w-auto">
              <Gift className="h-5 w-5" aria-hidden="true" />
              Loja ({student.coins} moedas)
            </Button>
          </Link>
        </div>
      </PageHeader>

      <TodayAgendaWidget
        items={agenda.items.length > 0 ? agenda.items : todayItems}
        dayStatus={agenda.dayStatus}
        title={`Seu dia, ${firstName}`}
        kidFriendly
      />

      <StudentHomeTasksList tasks={homeTasks} />

      <SchoolCalendarWidget settings={settings} compact />

      <LiveStudentStatsCard />

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Seu progresso
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="kid-card border-indigo-300 bg-gradient-to-br from-indigo-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-slate-700">
                <Star className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                Nível {student.level}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="kid-stat text-indigo-700">{student.xpTotal} XP</p>
              <div
                className="mt-3 h-4 overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                aria-valuenow={xpProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso para o próximo nível: ${xpProgress}%`}
              >
                <div className="h-4 rounded-full bg-indigo-600 transition-all" style={{ width: `${xpProgress}%` }} />
              </div>
              <p className="mt-2 text-base text-slate-600">Próximo nível: {xpForNextLevel} XP</p>
            </CardContent>
          </Card>

          <Card className="kid-card border-amber-300">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-slate-700">
                <Coins className="h-5 w-5 text-amber-600" aria-hidden="true" />
                Moedas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="kid-stat text-amber-600">{student.coins}</p>
              <p className="mt-2 text-base text-slate-600">Use na loja de recompensas</p>
            </CardContent>
          </Card>

          <Card className="kid-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-700">Média das notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="kid-stat text-slate-900">{avgGrade.toFixed(1)}</p>
            </CardContent>
          </Card>

          <Card className="kid-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-slate-700">
                <Trophy className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                Ranking da turma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="kid-stat text-emerald-700">#{myClassRank?.rank ?? "-"}</p>
              <p className="mt-1 text-sm text-slate-500">
                Escola: #{mySchoolRank?.rank ?? "-"}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {pendingExercises.length > 0 && (
        <section aria-labelledby="activities-heading">
          <Card className="kid-card border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
            <CardHeader>
              <CardTitle id="activities-heading" className="flex items-center gap-2 text-xl">
                <PenLine className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                Minhas atividades
              </CardTitle>
              <Link href="/dashboard/exercicios">
                <Button variant="ghost" size="sm" className="gap-1">
                  Ver todas <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingExercises.map((ex) => (
                <article
                  key={ex.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-white bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-slate-900">{ex.title}</h3>
                    <ExerciseRewardPills
                      xp={ex.xpReward}
                      coins={ex.coinReward}
                      className="mt-2"
                    />
                  </div>
                  <Link href={`/dashboard/exercicios/${ex.id}`}>
                    <Button size="lg" className="gap-2">
                      Começar
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </Link>
                </article>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="kid-card" id="missoes">
          <CardHeader>
            <CardTitle className="text-xl">Minhas missões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {missions.length === 0 && (
              <p className="text-lg text-slate-600">Nenhuma missão no momento. Volte em breve!</p>
            )}
            {missions.map((mission) => {
              const sm = student.studentMissions.find((m) => m.missionId === mission.id);
              const done = !!sm?.completedAt;
              const requested = !!sm && !sm.completedAt;
              return (
                <article key={mission.id} className="rounded-2xl border-2 border-slate-200 p-4">
                  <h3 className="text-lg font-bold text-slate-900">{mission.title}</h3>
                  <p className="mt-1 text-base text-slate-600">{mission.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>+{mission.xpReward} XP</Badge>
                    <Badge variant="warning">+{mission.coinReward} moedas</Badge>
                  </div>
                  <div className="mt-4">
                    {done ? (
                      <p className="text-base font-bold text-emerald-700" role="status">
                        Missão concluída!
                      </p>
                    ) : (
                      <RequestMissionButton
                        missionId={mission.id}
                        alreadyRequested={requested}
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </CardContent>
        </Card>

        <Card className="kid-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trophy className="h-6 w-6 text-emerald-600" aria-hidden="true" />
              Ranking da turma
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classRanking.length === 0 ? (
              <p className="text-lg text-slate-600">Ainda sem ranking nesta turma.</p>
            ) : (
              <ol className="space-y-2">
                {classRanking.slice(0, 8).map((item) => {
                  const isMe = item.id === student.id;
                  return (
                    <li
                      key={item.id}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-base ${
                        isMe ? "bg-indigo-100 font-bold text-indigo-900" : "bg-slate-50"
                      }`}
                    >
                      <span>
                        #{item.rank} {isMe ? "Você" : item.name.split(" ")[0]}
                      </span>
                      <span className="text-indigo-600">{item.xp} XP</span>
                    </li>
                  );
                })}
              </ol>
            )}
            <Link
              href="/dashboard/rankings"
              className="mt-4 inline-flex items-center gap-1 text-base font-semibold text-indigo-600 hover:underline"
            >
              Ver ranking completo
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <h3 className="mb-3 mt-6 text-lg font-bold">Suas conquistas</h3>
            <div className="flex flex-wrap gap-2">
              {student.studentBadges.length === 0 && (
                <p className="text-base text-slate-600">
                  Complete missões e mantenha boas notas para ganhar badges!
                </p>
              )}
              {student.studentBadges.map((sb) => (
                <Badge key={sb.id} variant="success" className="px-3 py-1.5 text-base">
                  {sb.badge.name}
                </Badge>
              ))}
            </div>

            <h3 className="mb-3 mt-6 text-lg font-bold">Atividade recente</h3>
            <ul className="space-y-3 text-base">
              {student.xpTransactions.length === 0 && (
                <li className="text-slate-600">Nenhuma atividade registrada ainda.</li>
              )}
              {student.xpTransactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <span>{tx.reason}</span>
                  <Badge variant="success">+{tx.amount} XP</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
