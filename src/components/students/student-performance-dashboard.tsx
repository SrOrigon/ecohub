import dynamic from "next/dynamic";
import { BookOpen, History, PenLine, Target, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { SubjectPrecisionPanel } from "@/components/institutional/subject-precision-panel";
import type { StudentHistory } from "@/lib/institutional-history";
import type { SubjectPrecisionOverview } from "@/lib/subject-precision";

const PerformanceChart = dynamic(
  () => import("@/components/charts/performance-charts").then((mod) => mod.PerformanceChart),
  { loading: () => <ChartSkeleton /> }
);
const SubjectPerformanceChart = dynamic(
  () => import("@/components/institutional/leitura-geral-charts").then((mod) => mod.SubjectPerformanceChart),
  { loading: () => <ChartSkeleton /> }
);
const InstitutionalHealthGauge = dynamic(
  () => import("@/components/institutional/leitura-geral-charts").then((mod) => mod.InstitutionalHealthGauge),
  { loading: () => <ChartSkeleton className="h-64" /> }
);
const HistoricalAnalyticsPanel = dynamic(
  () =>
    import("@/components/institutional/historical-analytics-panel").then(
      (mod) => mod.HistoricalAnalyticsPanel
    ),
  { loading: () => <ChartSkeleton className="h-96" /> }
);

function healthLabel(score: number) {
  if (score >= 80) return "Excelente";
  if (score >= 65) return "Bom";
  if (score >= 50) return "Atenção";
  return "Crítico";
}

export function StudentPerformanceDashboard({
  history,
  precision,
  passGrade,
  studentName,
}: {
  history: StudentHistory;
  precision: SubjectPrecisionOverview;
  passGrade: number;
  studentName: string;
}) {
  const monthlyData = history.series.month.buckets.map((bucket) => ({
    month: bucket.label,
    nota: bucket.averageGrade,
    xp: bucket.xpTotal,
    frequencia: bucket.attendanceRate,
  }));

  const subjectChartData = precision.entries
    .filter((entry) => entry.gradeCount > 0)
    .map((entry) => ({
      subject: entry.subject,
      average: entry.average,
      meta: passGrade,
    }));

  const lifetime = history.lifetime;
  const score = lifetime.healthScore;
  const belowPass = precision.entries.filter((entry) => entry.gradeCount > 0 && entry.average < passGrade);

  return (
    <section id="desempenho" className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Target className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          Desempenho individual
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Os mesmos indicadores da leitura geral e da precisão por disciplina, calculados só para {studentName}.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <InstitutionalHealthGauge
            score={score}
            label={healthLabel(score)}
            title="Saúde pedagógica do aluno"
            hint="Combina notas, frequência e entregas deste aluno desde a matrícula"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <MetricCard
            icon={BookOpen}
            label="Média geral"
            value={lifetime.averageGrade.toFixed(1)}
            sub={`Meta ${passGrade} · ${lifetime.gradesCount} nota(s)`}
            color="text-emerald-600"
          />
          <MetricCard
            icon={TrendingUp}
            label="Frequência"
            value={`${lifetime.attendanceRate}%`}
            color="text-amber-600"
          />
          <MetricCard
            icon={Target}
            label="Acima da meta"
            value={`${lifetime.passRate}%`}
            sub={belowPass.length > 0 ? `${belowPass.length} disciplina(s) abaixo` : "Todas as disciplinas na meta"}
            color="text-emerald-600"
          />
          <MetricCard
            icon={PenLine}
            label="Exercícios entregues"
            value={String(lifetime.exerciseSubmissions)}
            color="text-blue-600"
          />
          <MetricCard
            icon={Zap}
            label="XP acumulado"
            value={lifetime.xpTotal.toLocaleString("pt-BR")}
            color="text-emerald-600"
          />
          <MetricCard
            icon={History}
            label="Na plataforma"
            value={history.meta.accountAgeLabel}
            sub={`Desde ${history.meta.originLabel}`}
            color="text-violet-600"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PerformanceChart data={monthlyData} />
        <SubjectPerformanceChart data={subjectChartData} />
      </div>

      <SubjectPrecisionPanel data={precision} passGrade={passGrade} variant="student" />

      <HistoricalAnalyticsPanel
        history={history}
        title="Histórico individual"
        description="Evolução deste aluno dia a dia, semana a semana e mês a mês  -  desde a matrícula"
      />
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof BookOpen;
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
