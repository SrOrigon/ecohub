import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/student-finance";
import { AlertTriangle, CalendarCheck2, DollarSign, TrendingDown } from "lucide-react";
import type { ExecutiveDashboardData } from "@/lib/reads/executive-reads";

export function ExecutiveKpiGrid({
  data,
}: {
  data: ExecutiveDashboardData;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Receita Liquidada no Mês */}
      <Card className="border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase text-emerald-900 dark:text-emerald-300">
            Receita Liquidada (Mês)
          </CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-emerald-950 dark:text-emerald-100">
            {formatBRL(data.finance.paidCurrentMonthCents)}
          </p>
          <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-400">
            Faturas pagas no mês corrente
          </p>
        </CardContent>
      </Card>

      {/* 2. Inadimplência Ativa */}
      <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase text-amber-900 dark:text-amber-300">
            Inadimplência Ativa
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-amber-600" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-amber-950 dark:text-amber-100">
            {data.finance.delinquencyRatePercent}%
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-400">
            {formatBRL(data.finance.overdueTotalCents)} ({data.finance.overdueCount} em atraso)
          </p>
        </CardContent>
      </Card>

      {/* 3. Frequência Média Escolar */}
      <Card className="border-indigo-200 bg-indigo-50/30 dark:border-indigo-900/50 dark:bg-indigo-950/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase text-indigo-900 dark:text-indigo-300">
            Frequência Média (30d)
          </CardTitle>
          <CalendarCheck2 className="h-4 w-4 text-indigo-600" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-indigo-950 dark:text-indigo-100">
            {data.attendance.average30DaysPercent}%
          </p>
          <p className="mt-1 text-xs text-indigo-800 dark:text-indigo-400">
            Média de presença escolar recente
          </p>
        </CardContent>
      </Card>

      {/* 4. Estudantes em Atenção / Risco */}
      <Card className="border-red-200 bg-red-50/30 dark:border-red-900/50 dark:bg-red-950/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase text-red-900 dark:text-red-300">
            Estudantes em Atenção
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-red-950 dark:text-red-100">
            {data.atRiskCount}
          </p>
          <p className="mt-1 text-xs text-red-800 dark:text-red-400">
            Faltas elevadas ou notas &lt; 6.0
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
