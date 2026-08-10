import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export function ExerciseClassProgress({
  className,
  totalStudents,
  delivered,
  graded,
  pendingGrade,
}: {
  className: string | null;
  totalStudents: number;
  delivered: number;
  graded: number;
  pendingGrade: number;
}) {
  const pct = totalStudents > 0 ? Math.round((delivered / totalStudents) * 100) : 0;
  const missing = Math.max(0, totalStudents - delivered);

  return (
    <Card className="border-indigo-100 bg-indigo-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          Entregas da turma{className ? ` · ${className}` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-600">Progresso de entrega</span>
            <span className="font-semibold text-indigo-700">{pct}%</span>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {delivered} de {totalStudents} aluno(s) entregaram
            {missing > 0 ? ` · ${missing} pendente(s)` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {graded} corrigida(s)
          </Badge>
          {pendingGrade > 0 && (
            <Badge variant="warning" className="gap-1">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {pendingGrade} aguardando correção
            </Badge>
          )}
          {missing > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {missing} sem entrega
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
