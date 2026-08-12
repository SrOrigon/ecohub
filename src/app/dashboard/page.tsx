import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Target,
  TrendingUp,
  Users,
  Medal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClassComparisonChart, PerformanceChart } from "@/components/charts/performance-charts";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { getSessionUser } from "@/lib/auth";
import {
  getDashboardStats,
  getRanking,
  getMissions,
  getMonthlyPerformance,
  getClassComparison,
} from "@/lib/queries";
import { formatPercent } from "@/lib/utils";
import { RankingTableRows } from "@/components/profile/ranking-list";
import { LiveActivityFeed, LiveStatsStrip } from "@/components/metrics/live-activity-feed";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (user.role === "student") redirect("/dashboard/aluno");
  if (user.role === "teacher") redirect("/dashboard/professor");
  if (user.role === "parent") redirect("/dashboard/responsavel");
  if (user.role === "secretary") redirect("/dashboard/secretaria");

  const schoolId = user.schoolId;
  const [stats, ranking, missions, monthlyData, classData] = await Promise.all([
    getDashboardStats(schoolId).catch(() => ({
      totalStudents: 0,
      totalClasses: 0,
      averageGrade: 0,
      attendanceRate: 0,
      activeMissions: 0,
      totalXpAwarded: 0,
    })),
    getRanking(schoolId).catch(() => []),
    getMissions(schoolId).catch(() => []),
    getMonthlyPerformance(schoolId).catch(() => []),
    getClassComparison(schoolId).catch(() => []),
  ]);

  const statCards = [
    { label: "Alunos", value: stats.totalStudents, icon: Users, color: "text-indigo-600" },
    { label: "Turmas", value: stats.totalClasses, icon: GraduationCap, color: "text-violet-600" },
    { label: "Média Geral", value: stats.averageGrade.toFixed(1), icon: BookOpen, color: "text-emerald-600" },
    { label: "Frequência", value: formatPercent(stats.attendanceRate), icon: TrendingUp, color: "text-amber-600" },
    { label: "Missões Ativas", value: stats.activeMissions, icon: Target, color: "text-rose-600" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel do Diretor"
        description="Gestão acadêmica + engajamento gamificado em tempo real"
      >
        <Link
          href="/dashboard/leitura-geral"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Leitura geral da instituição
        </Link>
      </PageHeader>

      <LiveStatsStrip />

      <div className="responsive-grid">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
              <Icon className={`h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <PerformanceChart data={monthlyData} />
        <ClassComparisonChart data={classData} />
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader>
            <CardTitle>Ranking de XP</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            {ranking.length === 0 ? (
              <EmptyState
                icon={Medal}
                title="Ranking vazio"
                description="Cadastre alunos e lance notas ou missões para gerar XP."
                className="py-8"
              />
            ) : (
              <ResponsiveTable minWidth="32rem" caption="Ranking de XP dos alunos">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th scope="col" className="pb-3 pr-4">#</th>
                    <th scope="col" className="pb-3 pr-4">Aluno</th>
                    <th scope="col" className="hidden pb-3 pr-4 sm:table-cell">Turma</th>
                    <th scope="col" className="pb-3 pr-4">Nível</th>
                    <th scope="col" className="pb-3">XP</th>
                  </tr>
                </thead>
                <tbody>
                  <RankingTableRows items={ranking} />
                </tbody>
              </ResponsiveTable>
            )}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Missões ativas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {missions.filter((m) => m.isActive).length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="Nenhuma missão ativa"
                  description="Crie missões na área de gamificação."
                  className="py-6"
                />
              ) : (
                missions.filter((m) => m.isActive).slice(0, 5).map((mission) => (
                  <div key={mission.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-medium">{mission.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{mission.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="success">+{mission.xpReward} XP</Badge>
                      <Badge variant="warning">+{mission.coinReward} moedas</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <LiveActivityFeed />
        </div>
      </div>
    </div>
  );
}
