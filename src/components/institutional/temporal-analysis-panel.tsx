"use client";

import { useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp, Minus, CalendarRange } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PeriodComparison, TemporalAnalysis, MetricTrend } from "@/lib/institutional-trends";

type PeriodKey = "monthly" | "semester" | "annual";

const PERIOD_TABS: { key: PeriodKey; label: string; short: string }[] = [
  { key: "monthly", label: "Mensal", short: "Mês atual vs anterior" },
  { key: "semester", label: "Semestral", short: "6 meses vs 6 anteriores" },
  { key: "annual", label: "Anual", short: "12 meses vs ano anterior" },
];

export function TemporalAnalysisPanel({ analysis }: { analysis: TemporalAnalysis }) {
  const [period, setPeriod] = useState<PeriodKey>("monthly");
  const comparison = analysis[period];

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Análise temporal estratégica
          </CardTitle>
          <CardDescription>
            Evolução pedagógica em horizontes mensal, semestral e anual — identifique melhorias e quedas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-sm font-medium text-indigo-900">
            {analysis.overallVerdict}
          </p>

          <div className="touch-scroll-x flex gap-2 pb-1">
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPeriod(tab.key)}
                className={cn(
                  "rounded-xl border px-4 py-2 text-left transition",
                  period === tab.key
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 bg-white hover:border-indigo-200"
                )}
              >
                <span className="block text-sm font-semibold">{tab.label}</span>
                <span
                  className={cn(
                    "block text-xs",
                    period === tab.key ? "text-indigo-100" : "text-slate-500"
                  )}
                >
                  {tab.short}
                </span>
              </button>
            ))}
          </div>

          <PeriodComparisonView comparison={comparison} />
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Evolução nos últimos 12 meses</CardTitle>
          <CardDescription>Saúde pedagógica, média, frequência e aprovação mês a mês</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          {analysis.timeline.length === 0 ? (
            <p className="text-sm text-slate-500">Sem histórico mensal disponível.</p>
          ) : (
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={analysis.timeline} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{ fontSize: 11 }} width={32} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="healthScore" stroke="#6366f1" strokeWidth={2} name="Saúde pedagógica" dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="attendanceRate" stroke="#f59e0b" strokeWidth={2} name="Frequência %" dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={2} name="Aprovação %" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="averageGrade" stroke="#8b5cf6" strokeWidth={2} name="Média notas" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PeriodComparisonView({ comparison }: { comparison: PeriodComparison }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <PeriodCard title="Período atual" snapshot={comparison.current} accent="indigo" />
        <PeriodCard title="Período anterior" snapshot={comparison.previous} accent="slate" />
      </div>

      <p className="text-sm leading-relaxed text-slate-700">{comparison.summary}</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {comparison.trends.map((t) => (
          <TrendCard key={t.id} trend={t} />
        ))}
      </div>

      {comparison.strategicNotes.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-900">Notas estratégicas</p>
          <ul className="space-y-1 text-sm text-amber-950">
            {comparison.strategicNotes.map((note, i) => (
              <li key={i}>• {note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PeriodCard({
  title,
  snapshot,
  accent,
}: {
  title: string;
  snapshot: PeriodComparison["current"];
  accent: "indigo" | "slate";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        accent === "indigo" ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200 bg-slate-50/60"
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{snapshot.label}</p>
      <div className="stat-grid gap-2 text-sm">
        <Stat label="Média" value={snapshot.averageGrade.toFixed(1)} />
        <Stat label="Frequência" value={`${snapshot.attendanceRate}%`} />
        <Stat label="Aprovação" value={`${snapshot.passRate}%`} />
        <Stat label="Saúde" value={`${snapshot.healthScore}`} />
        <Stat label="XP" value={String(snapshot.xpTotal)} />
        <Stat label="Entregas" value={String(snapshot.exerciseSubmissions)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function TrendCard({ trend }: { trend: MetricTrend }) {
  const Icon =
    trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const color =
    trend.sentiment === "positive"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : trend.sentiment === "negative"
        ? "text-red-700 bg-red-50 border-red-200"
        : "text-slate-700 bg-slate-50 border-slate-200";

  const formatDelta = () => {
    const sign = trend.delta > 0 ? "+" : "";
    if (trend.unit === "nota") return `${sign}${trend.delta.toFixed(1)}`;
    if (trend.unit === "score") return `${sign}${Math.round(trend.delta)} pts`;
    if (trend.unit === "%") return `${sign}${Math.round(trend.delta)} p.p.`;
    return `${sign}${Math.round(trend.delta)}`;
  };

  return (
    <div className={cn("rounded-xl border p-3", color)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{trend.label}</p>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-xl font-bold">{formatValue(trend)}</span>
        <Badge variant={trend.sentiment === "positive" ? "success" : trend.sentiment === "negative" ? "danger" : "secondary"}>
          {formatDelta()}
        </Badge>
      </div>
      <p className="mt-1 text-xs opacity-80">
        Anterior: {formatValue({ ...trend, current: trend.previous })}
        {trend.deltaPercent != null && ` (${trend.deltaPercent > 0 ? "+" : ""}${trend.deltaPercent}%)`}
      </p>
    </div>
  );
}

function formatValue(t: { current: number; unit: MetricTrend["unit"] }) {
  if (t.unit === "nota") return t.current.toFixed(1);
  if (t.unit === "%") return `${Math.round(t.current)}%`;
  if (t.unit === "score") return `${Math.round(t.current)} pts`;
  return String(Math.round(t.current));
}
