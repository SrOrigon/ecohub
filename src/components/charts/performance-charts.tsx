"use client";

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMounted } from "@/hooks/use-is-mounted";

interface PerformanceChartProps {
  data: { month: string; nota: number; xp: number; frequencia: number }[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const mounted = useIsMounted();

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Desempenho ao longo do ano</CardTitle>
        <CardDescription>Média de notas, XP concedido e frequência mensal</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="h-56 w-full min-w-0 sm:h-64 lg:h-72">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" domain={[0, 10]} tick={{ fontSize: 12 }} width={32} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} width={32} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="nota" stroke="#6366f1" strokeWidth={2} name="Média de notas" />
                <Line yAxisId="right" type="monotone" dataKey="xp" stroke="#10b981" strokeWidth={2} name="XP total" />
                <Line yAxisId="right" type="monotone" dataKey="frequencia" stroke="#f59e0b" strokeWidth={2} name="Frequência %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ClassComparisonChartProps {
  data: { turma: string; media: number; engajamento: number }[];
}

export function ClassComparisonChart({ data }: ClassComparisonChartProps) {
  const mounted = useIsMounted();

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Comparativo por turma</CardTitle>
        <CardDescription>Média acadêmica vs. engajamento gamificado</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="h-52 w-full min-w-0 sm:h-60 lg:h-64">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis dataKey="turma" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} width={32} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="media" fill="#6366f1" name="Média (escala 0-10 x10)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="engajamento" fill="#10b981" name="Engajamento %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
