import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight, UserCheck } from "lucide-react";
import type { AtRiskStudentItem } from "@/lib/reads/executive-reads";

export function AtRiskStudentsTable({
  students,
}: {
  students: AtRiskStudentItem[];
}) {
  return (
    <Card className="border-red-200 bg-red-50/20 dark:border-red-900/50 dark:bg-red-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-red-950 dark:text-red-100">
          <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
          Estudantes Sinalizados em Risco Pedagógico / Frequência
        </CardTitle>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-emerald-700 dark:text-emerald-300">
            <UserCheck className="h-4 w-4" />
            Nenhum estudante em estado crítico de faltas ou notas insuficientes no momento.
          </div>
        ) : (
          <div className="table-scroll-container">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-red-100/50 text-red-950 dark:bg-red-950/40 dark:text-red-200">
                <tr>
                  <th className="p-2.5 font-bold">Estudante</th>
                  <th className="p-2.5 font-bold">Turma</th>
                  <th className="p-2.5 font-bold text-center">Frequência (30d)</th>
                  <th className="p-2.5 font-bold text-center">Média de Notas</th>
                  <th className="p-2.5 font-bold">Diagnóstico / Motivo</th>
                  <th className="p-2.5 font-bold text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 dark:divide-red-950/30">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-red-100/30 transition-colors dark:hover:bg-red-950/20"
                  >
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                      {student.name}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300 font-medium">
                      {student.className}
                    </td>
                    <td className="p-2.5 text-center font-semibold">
                      <span
                        className={
                          student.attendanceRatePercent < 75
                            ? "text-red-600 font-bold"
                            : "text-slate-700 dark:text-slate-300"
                        }
                      >
                        {student.attendanceRatePercent}%
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-semibold">
                      <span
                        className={
                          student.averageGrade < 6.0
                            ? "text-red-600 font-bold"
                            : "text-slate-700 dark:text-slate-300"
                        }
                      >
                        {student.averageGrade.toFixed(1)}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={student.severity === "CRITICAL" ? "danger" : "warning"}>
                          {student.severity === "CRITICAL" ? "Crítico" : "Alerta"}
                        </Badge>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          {student.reasons.join(" · ")}
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 text-center">
                      <Link
                        href={`/dashboard/alunos/${student.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-red-700 transition-colors shrink-0"
                      >
                        <span>Ficha 360</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
