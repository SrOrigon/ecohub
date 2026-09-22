import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  BookOpen,
  GraduationCap,
  PenLine,
  Target,
  TrendingUp,
  Users,
  Zap,
  Route,
  Award,
  ArrowRight,
  History,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getInstitutionalOverview } from "@/lib/institutional-overview";
import { getTemporalAnalysis } from "@/lib/institutional-trends";
import { getSubjectPrecisionOverview } from "@/lib/subject-precision";
import { getExecutiveDashboardData } from "@/lib/reads/executive-reads";
import { ExecutiveKpiGrid } from "@/components/institutional/executive-kpi-grid";
import { AtRiskStudentsTable } from "@/components/institutional/at-risk-students-table";
import { SubjectPrecisionSummaryStrip } from "@/components/institutional/subject-precision-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { redirect } from "next/navigation";
import { layout } from "@/lib/layout-classes";

const PerformanceChart = dynamic(
  () => import("@/components/charts/performance-charts").then((mod) => mod.PerformanceChart),
  { loading: () => <ChartSkeleton /> }
);
const ClassComparisonChart = dynamic(
  () => import("@/components/charts/performance-charts").then((mod) => mod.ClassComparisonChart),
  { loading: () => <ChartSkeleton /> }
);
const TemporalAnalysisPanel = dynamic(
  () => import("@/components/institutional/temporal-analysis-panel").then((mod) => mod.TemporalAnalysisPanel),
  { loading: () => <ChartSkeleton className="h-96" /> }
);
const InstitutionalHealthGauge = dynamic(
  () => import("@/components/institutional/leitura-geral-charts").then((mod) => mod.InstitutionalHealthGauge),
  { loading: () => <ChartSkeleton className="h-64" /> }
);
const SubjectPerformanceChart = dynamic(
  () => import("@/components/institutional/leitura-geral-charts").then((mod) => mod.SubjectPerformanceChart),
  { loading: () => <ChartSkeleton /> }
);

export default async function LeituraGeralPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "director", "secretary"].includes(user.role)) redirect("/dashboard");

  if (!user.schoolId) redirect("/dashboard");

  const [data, temporal, precision, executiveData] = await Promise.all([
    getInstitutionalOverview(user.schoolId),
    getTemporalAnalysis(user.schoolId),
    getSubjectPrecisionOverview(user.schoolId),
    getExecutiveDashboardData(user.schoolId),
  ]);

  const classChartData = data.classes.map((c) => ({
    turma: c.className,
    media: Math.round(c.averageGrade * 10),
    engajamento: c.engagementScore,
  }));

  const subjectChartData = data.subjectPerformance.map((s) => ({
    subject: s.subject,
    average: s.average,
    meta: data.passGrade,
  }));

  const severityVariant = (s: "high" | "medium" | "low") =>
    s === "high" ? "danger" : s === "medium" ? "warning" : "success";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leitura geral da instituição"
        description="Métricas pedagógicas unificadas  -  saúde acadêmica, engajamento, exercícios e pontos de melhoria"
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/historico"
            className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100"
          >
            <History className="h-4 w-4" aria-hidden="true" />
            Histórico temporal
          </Link>
        </div>
      </PageHeader>

      {/* Visão Executiva Agregada */}
      <ExecutiveKpiGrid data={executiveData} />

      <AtRiskStudentsTable students={executiveData.atRiskStudents} />

      <div className={layout.grid3}>
        <div className="min-w-0">
          <InstitutionalHealthGauge score={data.healthScore} label={data.healthLabel} />
        </div>
        <div className={`${layout.grid4} ${layout.span2} min-w-0`}>
          <MetricCard icon={Users} label="Alunos" value={String(data.totalStudents)} color="text-indigo-600" />
          <MetricCard icon={GraduationCap} label="Turmas" value={String(data.totalClasses)} color="text-violet-600" />
          <MetricCard icon={BookOpen} label="Média geral" value={data.averageGrade.toFixed(1)} sub={`Meta ${data.passGrade}`} color="text-emerald-600" />
          <MetricCard icon={TrendingUp} label="Taxa de aprovação" value={`${data.passRate}%`} sub={`${data.studentsBelowPass} abaixo da meta`} color="text-emerald-600" />
          <MetricCard icon={TrendingUp} label="Frequência" value={`${data.attendanceRate}%`} color="text-amber-600" />
          <MetricCard icon={AlertTriangle} label="Alertas" value={String(data.alertsTotal)} sub={`${data.alertsHigh} críticos`} color="text-red-600" />
          <MetricCard icon={PenLine} label="Exercícios" value={String(data.exercisesTotal)} sub={`${data.exercisePendingGrading} p/ corrigir`} color="text-blue-600" />
          <MetricCard icon={Zap} label="XP (semana)" value={String(data.xpThisWeek)} sub={`${data.totalXpAwarded.toLocaleString("pt-BR")} total`} color="text-emerald-600" />
        </div>
      </div>

      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Target className="h-5 w-5" aria-hidden="true" />
            Onde melhorar
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {data.improvements.map((item) => (
            <Link
              key={item.area}
              href={item.actionHref}
              className="flex items-start justify-between gap-3 rounded-xl border border-white bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{item.area}</p>
                  <Badge variant={severityVariant(item.severity)}>
                    {item.severity === "high" ? "Prioridade" : item.severity === "medium" ? "Atenção" : "OK"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <TemporalAnalysisPanel analysis={temporal} />

      <SubjectPrecisionSummaryStrip data={precision} passGrade={data.passGrade} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PerformanceChart data={data.monthlyTrend} />
        <SubjectPerformanceChart data={subjectChartData} />
      </div>

      <ClassComparisonChart data={classChartData} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engajamento unificado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Missões concluídas" value={`${data.engagement.avgMissionRate}%`} />
            <Row label="Exercícios entregues" value={`${data.engagement.avgExerciseRate}%`} />
            <Row label="Frequência (turmas)" value={`${data.engagement.avgAttendanceRate}%`} />
            <Row label="Missões ativas" value={String(data.activeMissions)} />
            <Row label="Correções pendentes" value={String(data.exercisePendingGrading)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gamificação & trilhas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="XP esta semana" value={String(data.xpThisWeek)} icon={Zap} />
            <Row label="XP acumulado" value={data.totalXpAwarded.toLocaleString("pt-BR")} />
            <Row label="Badges conquistados" value={String(data.badgeEarnedCount)} icon={Award} />
            <Row label="Progresso em trilhas" value={String(data.trailProgressCount)} icon={Route} />
            <Row label="Professores" value={String(data.totalTeachers)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Alertas recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topAlerts.length === 0 ? (
              <p className="text-sm text-emerald-700">Nenhum alerta crítico no momento.</p>
            ) : (
              data.topAlerts.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  className="block rounded-lg border border-slate-100 p-2 text-sm hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={a.severity === "high" ? "danger" : "warning"}>{a.title}</Badge>
                  </div>
                  <p className="mt-1 text-slate-600">{a.message}</p>
                </Link>
              ))
            )}
            {data.alertsTotal > 0 && (
              <Link href="/dashboard/alertas" className="text-sm font-medium text-indigo-600 hover:underline">
                Ver todos ({data.alertsTotal})
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leitura por turma</CardTitle>
        </CardHeader>
        <CardContent className="table-scroll-container">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-3 pr-4">Turma</th>
                <th className="pb-3 pr-4">Alunos</th>
                <th className="pb-3 pr-4">Média</th>
                <th className="pb-3 pr-4">Aprovação</th>
                <th className="pb-3 pr-4">Frequência</th>
                <th className="pb-3 pr-4">Engajamento</th>
                <th className="pb-3">Missões / Exerc.</th>
              </tr>
            </thead>
            <tbody>
              {data.classes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    Cadastre turmas e lance dados para ver a leitura.
                  </td>
                </tr>
              ) : (
                data.classes.map((c) => (
                  <tr key={c.classId} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-medium">
                      <Link href={`/dashboard/turmas`} className="hover:text-indigo-600">
                        {c.className}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{c.studentCount}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={c.averageGrade >= data.passGrade ? "success" : "warning"}>
                        {c.averageGrade.toFixed(1)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">{c.passRate}%</td>
                    <td className="py-3 pr-4">{c.attendanceRate}%</td>
                    <td className="py-3 pr-4">{c.engagementScore}%</td>
                    <td className="py-3">
                      {c.missionRate}% / {c.exerciseRate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data.subjectPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Disciplinas  -  detalhe</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.subjectPerformance.map((s) => (
              <div key={s.subject} className="rounded-xl border border-slate-100 p-4">
                <p className="font-semibold">{s.subject}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{s.average.toFixed(1)}</p>
                <p className="text-xs text-slate-500">
                  {s.gradeCount} nota(s) · {s.studentsBelowPass} abaixo de {data.passGrade}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-slate-500">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold">{value}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Zap;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1 text-slate-600">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
