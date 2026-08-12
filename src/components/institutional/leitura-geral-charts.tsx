"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SubjectChartProps {
  data: { subject: string; average: number; meta: number }[];
}

export function SubjectPerformanceChart({ data }: SubjectChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const safeData = data.map((d) => ({
    subject: d.subject ?? "—",
    average: isNaN(d.average) ? 0 : d.average,
    meta: isNaN(d.meta) ? 7 : d.meta,
  }));

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Desempenho por disciplina</CardTitle>
        <CardDescription>Média de notas vs. meta institucional</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        {!mounted || safeData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Nenhuma nota lançada ainda.</p>
        ) : (
          <div className="h-56 w-full min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={safeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={48} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} width={32} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="average" name="Média" radius={[4, 4, 0, 0]}>
                  {safeData.map((entry, i) => (
                    <Cell key={i} fill={entry.average >= entry.meta ? "#10b981" : entry.average >= entry.meta - 1 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface HealthGaugeProps {
  score: number;
  label: string;
}

export function InstitutionalHealthGauge({ score, label }: HealthGaugeProps) {
  const safeScore = isNaN(score) || score == null ? 0 : Math.min(100, Math.max(0, Math.round(score)));
  const color =
    safeScore >= 80 ? "text-emerald-600" : safeScore >= 65 ? "text-indigo-600" : safeScore >= 50 ? "text-amber-600" : "text-red-600";
  const bg =
    safeScore >= 80 ? "from-emerald-50 to-white" : safeScore >= 65 ? "from-indigo-50 to-white" : safeScore >= 50 ? "from-amber-50 to-white" : "from-red-50 to-white";

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-6 ${bg} border-slate-200`}>
      <p className="text-sm font-medium text-slate-500">Saúde pedagógica institucional</p>
      <p className={`mt-2 text-5xl font-bold tabular-nums ${color}`}>{safeScore}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{label || "Atenção"}</p>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-all ${safeScore >= 80 ? "bg-emerald-500" : safeScore >= 65 ? "bg-indigo-500" : safeScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${safeScore}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Combina notas, frequência, engajamento e alertas de risco
      </p>
    </div>
  );
}
