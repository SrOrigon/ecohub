import { getSessionUser } from "@/lib/auth";
import { getEngagementOverview } from "@/lib/engagement";
import { PageHeader } from "@/components/layout/page-header";
import { LiveStatsStrip, LiveActivityFeed } from "@/components/metrics/live-activity-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";
import { Activity, Target, PenLine, Users, Zap } from "lucide-react";

export default async function EngajamentoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "director", "teacher"].includes(user.role)) redirect("/dashboard");

  const teacherId = user.role === "teacher" ? user.id : undefined;
  const data = await getEngagementOverview(user.schoolId, teacherId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel de engajamento"
        description="Missões, exercícios, frequência e XP — visão unificada da participação."
      />

      <LiveStatsStrip />

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-500">Alunos</CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{data.totalStudents}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-500">Missões ativas</CardTitle>
            <Target className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{data.activeMissions}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-500">Correções pendentes</CardTitle>
            <PenLine className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{data.pendingSubmissions}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-500">XP esta semana</CardTitle>
            <Zap className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{data.xpThisWeek}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Médias gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Missões: <strong>{data.avgMissionRate}%</strong></p>
            <p>Exercícios: <strong>{data.avgExerciseRate}%</strong></p>
            <p>Frequência: <strong>{data.avgAttendanceRate}%</strong></p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Engajamento por turma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.classes.length === 0 ? (
              <p className="text-sm text-slate-500">Sem turmas.</p>
            ) : (
              data.classes.map((c) => (
                <div key={c.classId} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{c.className}</p>
                    <Badge variant={c.engagementScore >= 70 ? "success" : c.engagementScore >= 40 ? "warning" : "secondary"}>
                      {c.engagementScore}% engajamento
                    </Badge>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full bg-[color:var(--school-primary)]" style={{ width: `${c.engagementScore}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {c.studentCount} alunos · Missões {c.missionRate}% · Exercícios {c.exerciseRate}% · XP médio {c.avgXp}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top alunos por XP</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {data.topStudents.map((s, i) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>
                  <strong>{i + 1}.</strong> {s.name}
                </span>
                <span className="text-slate-600">Nv. {s.level} · {s.xp} XP</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <LiveActivityFeed title="Feed de atividades" maxItems={10} />
    </div>
  );
}
