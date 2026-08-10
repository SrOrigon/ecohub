import { getSessionUser } from "@/lib/auth";
import {
  getDashboardStats,
  getMonthlyPerformance,
  getClassComparison,
} from "@/lib/queries";
import { ClassComparisonChart, PerformanceChart } from "@/components/charts/performance-charts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function RelatoriosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "student") redirect("/dashboard/aluno");

  const [stats, monthlyData, classData] = await Promise.all([
    getDashboardStats(user.schoolId),
    getMonthlyPerformance(user.schoolId),
    getClassComparison(user.schoolId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Dashboards executivos com dados reais do banco"
      />

      <div className="responsive-grid">
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Média institucional</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.averageGrade.toFixed(1)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Taxa de frequência</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{formatPercent(stats.attendanceRate)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">XP total distribuído</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.totalXpAwarded.toLocaleString("pt-BR")}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Missões em andamento</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.activeMissions}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PerformanceChart data={monthlyData} />
        <ClassComparisonChart data={classData} />
      </div>
    </div>
  );
}
