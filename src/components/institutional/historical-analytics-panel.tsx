"use client";

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import {
  CalendarClock,
  TrendingDown,
  TrendingUp,
  Minus,
  History,
  Database,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InstitutionalHistory, HistoryGranularity, StudentHistory } from "@/lib/institutional-history";
import { getGranularityLabel } from "@/lib/institutional-history";
import type { MetricTrend, PeriodComparison, PeriodSnapshot } from "@/lib/institutional-trends";

type HistoryData = InstitutionalHistory | StudentHistory;

const ALL_GRANULARITIES: HistoryGranularity[] = ["day", "week", "month", "semester", "year"];

export function HistoricalAnalyticsPanel({
  history,
  title = "Histórico temporal",
  description = "Compare métricas do dia ao ano — calculado desde a criação da conta no EduHub",
}: {
  history: HistoryData;
  title?: string;
  description?: string;
}) {
  const defaultGranularity =
    history.availableGranularities[history.availableGranularities.length - 1] ?? "month";
  const [granularity, setGranularity] = useState<HistoryGranularity>(defaultGranularity);

  const series = useMemo(() => {
    if ("semester" in history.series) {
      return (history as InstitutionalHistory).series[granularity];
    }
    const studentSeries = history as StudentHistory;
    if (granularity === "semester" || granularity === "year") {
      return studentSeries.series.month;
    }
    return studentSeries.series[granularity as "day" | "week" | "month"];
  }, [history, granularity]);

  const chartData = series.buckets.map((b) => ({
    label: b.label,
    healthScore: b.healthScore,
    averageGrade: b.averageGrade,
    attendanceRate: b.attendanceRate,
    passRate: b.passRate,
    xp: b.xpTotal,
    entregas: b.exerciseSubmissions,
  }));

  const isInstitutional = "totalGrades" in history.meta;

  return (
    <div className="space-y-6">
      <Card className="border-violet-100 bg-gradient-to-br from-violet-50/80 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-violet-600" aria-hidden="true" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetaTile
              label="Conta desde"
              value={history.meta.originLabel}
              icon={CalendarClock}
            />
            <MetaTile
              label="Tempo no sistema"
              value={history.meta.accountAgeLabel}
              sub={`${history.meta.accountAgeDays} dias`}
            />
            {isInstitutional && (
              <>
                <MetaTile
                  label="Registros totais"
                  value={String(
                    (history as InstitutionalHistory).meta.totalGrades +
                      (history as InstitutionalHistory).meta.totalAttendance
                  )}
                  sub="notas + frequência"
                  icon={Database}
                />
                <MetaTile
                  label="Saúde acumulada"
                  value={`${history.lifetime.healthScore}/100`}
                  sub={`${history.lifetime.xpTotal.toLocaleString("pt-BR")} XP`}
                />
              </>
            )}
            {!isInstitutional && (
              <>
                <MetaTile label="Média geral" value={history.lifetime.averageGrade.toFixed(1)} />
                <MetaTile label="Saúde pedagógica" value={`${history.lifetime.healthScore}/100`} />
              </>
            )}
          </div>

          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
            <ul className="space-y-1 text-sm text-violet-950">
              {"insights" in history &&
                (history as InstitutionalHistory).insights.map((note, i) => (
                  <li key={i}>• {note}</li>
                ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Granularidade temporal</CardTitle>
          <CardDescription>
            Selecione o intervalo de comparação — do dia individual ao ano letivo completo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="touch-scroll-x flex gap-2 pb-1">
            {ALL_GRANULARITIES.map((g) => {
              const available = history.availableGranularities.includes(g);
              const isStudentLimited =
                !("semester" in history.series) && (g === "semester" || g === "year");
              if (isStudentLimited) return null;
              return (
                <button
                  key={g}
                  type="button"
                  disabled={!available}
                  onClick={() => setGranularity(g)}
                  className={cn(
                    "shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition",
                    granularity === g
                      ? "border-violet-600 bg-violet-600 text-white"
                      : available
                        ? "border-slate-200 bg-white hover:border-violet-200"
                        : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                  )}
                >
                  {getGranularityLabel(g)}
                  {!available && (
                    <span className="ml-1 text-xs font-normal opacity-70">(em breve)</span>
                  )}
                </button>
              );
            })}
          </div>

          {series.latestComparison && (
            <ComparisonStrip comparison={series.latestComparison} />
          )}

          {chartData.length === 0 ? (
            <p className="text-sm text-slate-500">
              Sem buckets nesta granularidade. Lance dados acadêmicos para preencher o histórico.
            </p>
          ) : (
            <>
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{ fontSize: 11 }} width={32} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="healthScore"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      name="Saúde pedagógica"
                      dot={false}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="attendanceRate"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Frequência %"
                      dot={false}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="passRate"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Aprovação %"
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="averageGrade"
                      stroke="#6366f1"
                      strokeWidth={2}
                      name="Média"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="xp" fill="#8b5cf6" name="XP" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="entregas" fill="#06b6d4" name="Entregas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabela histórica — {getGranularityLabel(granularity)}</CardTitle>
          <CardDescription>
            {series.bucketCount} período(s) desde {history.meta.originLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="table-scroll-container">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-3 pr-4">Período</th>
                <th className="pb-3 pr-4">Média</th>
                <th className="pb-3 pr-4">Freq.</th>
                <th className="pb-3 pr-4">Aprovação</th>
                <th className="pb-3 pr-4">Saúde</th>
                <th className="pb-3 pr-4">XP</th>
                <th className="pb-3">Entregas</th>
              </tr>
            </thead>
            <tbody>
              {series.buckets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    Nenhum período com dados.
                  </td>
                </tr>
              ) : (
                [...series.buckets].reverse().map((row) => (
                  <HistoryTableRow key={row.start} row={row} />
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-slate-50/50">
        <CardHeader>
          <CardTitle className="text-base">Acumulado desde a criação</CardTitle>
        </CardHeader>
        <CardContent>
          <LifetimeGrid snapshot={history.lifetime} />
        </CardContent>
      </Card>
    </div>
  );
}

function MetaTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: typeof CalendarClock;
}) {
  return (
    <div className="rounded-xl border border-white bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-violet-500" aria-hidden="true" />}
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function ComparisonStrip({ comparison }: { comparison: PeriodComparison }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-sm font-semibold text-slate-800">{comparison.kindLabel}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {comparison.trends.map((t) => (
          <TrendPill key={t.id} trend={t} />
        ))}
      </div>
    </div>
  );
}

function TrendPill({ trend }: { trend: MetricTrend }) {
  const Icon =
    trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const color =
    trend.sentiment === "positive"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : trend.sentiment === "negative"
        ? "bg-red-50 text-red-800 border-red-200"
        : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm", color)}>
      <span className="font-medium">{trend.label}</span>
      <span className="flex items-center gap-1 font-bold">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {trend.delta > 0 ? "+" : ""}
        {trend.unit === "nota" ? trend.delta.toFixed(1) : Math.round(trend.delta)}
      </span>
    </div>
  );
}

function HistoryTableRow({ row }: { row: PeriodSnapshot }) {
  return (
    <tr className="border-b border-slate-50">
      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
      <td className="py-2.5 pr-4">{row.averageGrade.toFixed(1)}</td>
      <td className="py-2.5 pr-4">{row.attendanceRate}%</td>
      <td className="py-2.5 pr-4">{row.passRate}%</td>
      <td className="py-2.5 pr-4">
        <Badge variant={row.healthScore >= 65 ? "success" : row.healthScore >= 50 ? "warning" : "danger"}>
          {row.healthScore}
        </Badge>
      </td>
      <td className="py-2.5 pr-4">{row.xpTotal.toLocaleString("pt-BR")}</td>
      <td className="py-2.5">{row.exerciseSubmissions}</td>
    </tr>
  );
}

function LifetimeGrid({ snapshot }: { snapshot: PeriodSnapshot }) {
  const items = [
    { label: "Média geral", value: snapshot.averageGrade.toFixed(1) },
    { label: "Frequência", value: `${snapshot.attendanceRate}%` },
    { label: "Aprovação", value: `${snapshot.passRate}%` },
    { label: "Saúde pedagógica", value: `${snapshot.healthScore}/100` },
    { label: "XP total", value: snapshot.xpTotal.toLocaleString("pt-BR") },
    { label: "Entregas", value: String(snapshot.exerciseSubmissions) },
    { label: "Notas lançadas", value: String(snapshot.gradesCount) },
    { label: "Registros", value: String(snapshot.dataPoints) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-100 bg-white p-3">
          <p className="text-xs text-slate-500">{item.label}</p>
          <p className="text-xl font-bold text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
