import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { fetchChildForParent } from "@/lib/reads/parent-reads";
import { getExercisesForStudentId, EXERCISE_KIND_LABELS } from "@/lib/exercises";
import {
  ExerciseStatusBadge,
  ExerciseRewardPills,
  getStudentExerciseStatus,
} from "@/components/exercises/exercise-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate } from "@/lib/utils";
import { ATTENDANCE_LABELS, OCCURRENCE_LABELS, type AttendanceStatus, type OccurrenceKind } from "@/lib/constants";
import { getOccurrencesForStudent } from "@/actions/diary";
import { getHomeTasksForStudent } from "@/actions/home-tasks";
import { JustifyAbsencePanel } from "@/components/parents/justify-absence-form";
import { CreateHomeTaskForm } from "@/components/forms/create-home-task-form";
import { ParentHomeTasksPanel } from "@/components/home-tasks/parent-home-tasks-panel";
import { AttentionAlertsPanel } from "@/components/alerts/attention-alerts-panel";
import { getAttentionAlertsSnapshot } from "@/lib/attention-alerts";
import { ParentEncouragementPanel } from "@/components/parents/parent-encouragement";
import { SkillsRadarChart } from "@/components/charts/skills-radar-chart";
import { notFound, redirect } from "next/navigation";
import { BookOpen, FileText, Gift, Medal, Target, PenLine, Home } from "lucide-react";

function attendanceLabel(status: string) {
  return ATTENDANCE_LABELS[status as AttendanceStatus] ?? status;
}

export default async function FilhoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login/responsavel");
  if (user.role !== "parent") redirect("/dashboard");

  const { id } = await params;
  const link = await fetchChildForParent(user, user.id, id);
  if (!link) notFound();

  const student = link.student;
  const avgGrade =
    student.grades.length > 0
      ? student.grades.reduce((s, g) => s + g.value, 0) / student.grades.length
      : 0;

  const exercises = await getExercisesForStudentId(student.id, user.schoolId);
  const exerciseItems = exercises.map((ex) => {
    const sub = ex.submissions[0];
    const status = getStudentExerciseStatus(sub, ex.dueDate, !!sub);
    return { ...ex, sub, status };
  });
  const pendingExercises = exerciseItems.filter((e) => e.status === "pending").length;
  const [occurrences, homeTasks, alertsSnapshot] = await Promise.all([
    getOccurrencesForStudent(student.id, user.schoolId ?? ""),
    getHomeTasksForStudent(student.id),
    getAttentionAlertsSnapshot(user),
  ]);

  const grades = student.grades ?? [];
  const mathGrades = grades.filter(
    (g) =>
      g.subject?.toLowerCase().includes("mat") ||
      g.subject?.toLowerCase().includes("fís")
  );
  const langGrades = grades.filter(
    (g) =>
      g.subject?.toLowerCase().includes("port") ||
      g.subject?.toLowerCase().includes("ing") ||
      g.subject?.toLowerCase().includes("red")
  );
  const natGrades = grades.filter(
    (g) =>
      g.subject?.toLowerCase().includes("ciên") ||
      g.subject?.toLowerCase().includes("biol") ||
      g.subject?.toLowerCase().includes("quím")
  );
  const humGrades = grades.filter(
    (g) =>
      g.subject?.toLowerCase().includes("hist") ||
      g.subject?.toLowerCase().includes("geog") ||
      g.subject?.toLowerCase().includes("filo")
  );

  function avgTo100(list: typeof grades, fallback = 80) {
    if (list.length === 0) return fallback;
    const avg = list.reduce((s, g) => s + g.value, 0) / list.length;
    return Math.min(100, Math.max(20, Math.round(avg * 10)));
  }

  const baseGradeScore = Math.min(100, Math.round(avgGrade * 10)) || 80;
  const radarAxes = [
    { label: "Linguagens", value: avgTo100(langGrades, baseGradeScore) },
    { label: "Matemática", value: avgTo100(mathGrades, baseGradeScore) },
    { label: "Natureza", value: avgTo100(natGrades, baseGradeScore) },
    { label: "Humanas", value: avgTo100(humGrades, baseGradeScore) },
    { label: "Frequência", value: 92 },
    { label: "Constância", value: Math.min(100, Math.max(60, 60 + student.studentBadges.length * 8)) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/dashboard/responsavel"
        backLabel="Voltar aos filhos"
        title={student.user.fullName}
        description={`${student.classGroup?.name ?? "Sem turma"} · Matrícula ${student.enrollmentCode}`}
      >
        <Link href={`/dashboard/alunos/${student.id}/boletim`} className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            Boletim completo
          </Button>
        </Link>
        <CreateHomeTaskForm childOptions={[{ id: student.id, name: student.user.fullName }]} />
      </PageHeader>

      {/* Painel Interativo de Incentivo e Figurinhas de Orgulho */}
      <ParentEncouragementPanel
        studentId={student.id}
        studentName={student.user.fullName}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Média geral</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{avgGrade.toFixed(1)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Nível / XP</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-indigo-600">Nv.{student.level} · {student.xpTotal}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Moedas</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-amber-600">{student.coins}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Conquistas</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{student.studentBadges.length}</p></CardContent>
        </Card>
      </div>

      {/* Gráfico Teia de Competências 360° */}
      <SkillsRadarChart axes={radarAxes} studentName={student.user.fullName} />

      <AttentionAlertsPanel
        initialAlerts={alertsSnapshot.alerts}
        studentId={student.id}
        compact
        maxItems={6}
        title="Alertas monitorados deste filho"
        description="Matérias com dificuldade, faltas e prazos pendentes."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-violet-600" aria-hidden="true" />
            Tarefas de casa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ParentHomeTasksPanel
            tasks={homeTasks.map((t) => ({
              ...t,
              student: { user: { fullName: student.user.fullName } },
            }))}
          />
        </CardContent>
      </Card>

      {exerciseItems.length > 0 && (
        <Card id="exercicios" className={pendingExercises > 0 ? "border-amber-200" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              Exercícios e provas
              {pendingExercises > 0 && (
                <Badge variant="warning">{pendingExercises} pendente(s)</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {exerciseItems.slice(0, 8).map((ex) => (
              <div
                key={ex.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3"
              >
                <div>
                  <p className="font-medium">{ex.title}</p>
                  <p className="text-xs text-slate-500">
                    {EXERCISE_KIND_LABELS[ex.kind as keyof typeof EXERCISE_KIND_LABELS] ?? ex.kind}
                    {ex.dueDate && ` · Prazo ${formatDate(ex.dueDate)}`}
                  </p>
                  <ExerciseRewardPills xp={ex.xpReward} coins={ex.coinReward} className="mt-1" />
                </div>
                <ExerciseStatusBadge
                  status={ex.status}
                  score={ex.sub?.score}
                  maxScore={ex.sub?.maxScore}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Notas</CardTitle></CardHeader>
          <CardContent>
            {student.grades.length === 0 ? (
              <EmptyState icon={BookOpen} title="Sem notas" description="Nenhuma nota lançada ainda." className="py-6" />
            ) : (
              <ul className="space-y-2 text-sm">
                {student.grades.map((g) => (
                  <li key={g.id} className="flex justify-between border-b border-slate-100 py-2">
                    <span>{g.subject} · {g.period}</span>
                    <Badge variant={g.value >= 7 ? "success" : g.value >= 5 ? "warning" : "danger"}>
                      {g.value.toFixed(1)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Frequência recente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <JustifyAbsencePanel
              studentId={student.id}
              absences={student.attendance.map((a) => ({
                id: a.id,
                date: a.date,
                status: a.status,
                justificationNote: a.justificationNote,
              }))}
            />
            {student.attendance.length === 0 ? (
              <EmptyState title="Sem registros" description="A frequência aparecerá após a chamada." className="py-6" />
            ) : (
              <ul className="space-y-2 text-sm">
                {student.attendance.map((a) => (
                  <li key={a.id} className="border-b border-slate-100 py-2">
                    <div className="flex justify-between gap-2">
                      <span>{formatDate(a.date)}</span>
                      <Badge>{attendanceLabel(a.status)}</Badge>
                    </div>
                    {a.justificationNote && (
                      <p className="mt-1 text-xs text-slate-500">{a.justificationNote}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card id="missoes">
          <CardHeader><CardTitle>Missões</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {student.studentMissions.length === 0 ? (
              <EmptyState icon={Target} title="Sem missões" description="Missões atribuídas aparecerão aqui." className="py-6" />
            ) : (
              student.studentMissions.map((sm) => (
                <div key={sm.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium">{sm.mission.title}</p>
                  <p className="text-xs text-slate-500">
                    {sm.completedAt ? `Concluída em ${formatDate(sm.completedAt)}` : "Em andamento"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Badges e resgates</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {student.studentBadges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {student.studentBadges.map((sb) => (
                  <Badge key={sb.id} variant="default" className="inline-flex items-center gap-1">
                    {sb.badge.imageUrl ? (
                      <img src={sb.badge.imageUrl} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                    ) : (
                      <Medal className="mr-1 h-3 w-3" aria-hidden="true" />
                    )}
                    {sb.badge.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nenhuma conquista ainda.</p>
            )}

            <div>
              <p className="mb-2 flex items-center gap-1 text-sm font-medium text-slate-700">
                <Gift className="h-4 w-4" aria-hidden="true" /> Resgates na loja
              </p>
              {student.rewardRedemptions.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum resgate ainda.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {student.rewardRedemptions.map((r) => (
                    <li key={r.id} className="flex justify-between gap-2 border-b border-slate-100 py-2">
                      <span>
                        {r.reward.name}{" "}
                        <Badge variant={r.status === "fulfilled" ? "success" : "warning"} className="ml-1">
                          {r.status === "fulfilled" ? "Entregue" : "Pendente"}
                        </Badge>
                      </span>
                      <span className="text-amber-600">-{r.coinCost} moedas</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {occurrences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ocorrências escolares</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {occurrences.map((o) => (
              <div key={o.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{OCCURRENCE_LABELS[o.kind as OccurrenceKind] ?? o.kind}</Badge>
                  <span className="text-xs text-slate-500">{formatDate(o.date)}</span>
                </div>
                <p className="mt-2 text-slate-800">{o.description}</p>
                <p className="mt-1 text-xs text-slate-500">{o.teacher.fullName} · {o.classGroup.name}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
