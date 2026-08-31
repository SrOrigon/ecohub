"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Eye, PenLine, Sparkles, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ActiveExerciseMonitorItem = {
  id: string;
  title: string;
  className: string;
  kind: string;
  totalTargetStudents: number;
  submittedCount: number;
  gradedCount: number;
  dueDate: string | null;
  isActive: boolean;
};

export function LiveExerciseMonitor({
  exercises = [],
}: {
  exercises: ActiveExerciseMonitorItem[];
}) {
  if (exercises.length === 0) return null;

  return (
    <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-white via-indigo-50/20 to-white shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Acompanhamento de Atividades em Andamento
              </CardTitle>
              <p className="text-xs text-slate-500">
                Progresso de respostas e entregas dos seus alunos em tempo real
              </p>
            </div>
          </div>
          <Link href="/dashboard/exercicios">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <PenLine className="h-3.5 w-3.5" />
              Ver todos os exercícios
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((ex) => {
            const total = Math.max(1, ex.totalTargetStudents);
            const percent = Math.min(100, Math.round((ex.submittedCount / total) * 100));
            const isCompleted = ex.submittedCount >= ex.totalTargetStudents && ex.totalTargetStudents > 0;
            const needsGrading = ex.submittedCount > ex.gradedCount;

            return (
              <div
                key={ex.id}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 truncate max-w-[65%]">
                      {ex.className}
                    </span>
                    <Badge variant={isCompleted ? "success" : "secondary"} className="text-[10px] py-0">
                      {ex.kind === "exam" ? "Prova" : "Exercício"}
                    </Badge>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {ex.title}
                  </h3>

                  {/* Progress Bar with Shimmer */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {ex.submittedCount} de {ex.totalTargetStudents} alunos
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {percent}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 shimmer-bar">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isCompleted
                            ? "bg-emerald-500"
                            : percent > 50
                              ? "bg-indigo-600"
                              : "bg-amber-500"
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800/60">
                  <span className="text-[11px] text-slate-500">
                    {needsGrading ? (
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {ex.submittedCount - ex.gradedCount} para corrigir
                      </span>
                    ) : (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Corrigido
                      </span>
                    )}
                  </span>
                  <Link href={`/dashboard/exercicios/${ex.id}`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                      <Eye className="h-3.5 w-3.5" /> Abrir
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
