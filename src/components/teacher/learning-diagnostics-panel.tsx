"use client";

import { useState, useTransition } from "react";
import { BrainCircuit, AlertTriangle, CheckCircle2, Sparkles, Send, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createAiReinforcementExerciseAction, type TopicDiagnostic } from "@/actions/learning-diagnostics";
import { playLevelUpSound } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

export function LearningDiagnosticsPanel({
  initialDiagnostics = [],
}: {
  initialDiagnostics: TopicDiagnostic[];
}) {
  const [diagnostics] = useState<TopicDiagnostic[]>(initialDiagnostics);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  if (diagnostics.length === 0) return null;

  function handleCreateReinforcement(diag: TopicDiagnostic) {
    if (diag.studentsNeedingHelp.length === 0) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("classId", diag.classId);
      fd.set("topic", diag.topic);
      fd.set("studentIds", JSON.stringify(diag.studentsNeedingHelp.map((s) => s.id)));

      const res = await createAiReinforcementExerciseAction(fd);
      if (res.success) {
        playLevelUpSound();
        setFeedback((prev) => ({
          ...prev,
          [diag.topic]: `Reforço criado e enviado para ${diag.studentsNeedingHelp.length} aluno(s)! ✨`,
        }));
      }
    });
  }

  return (
    <Card className="overflow-hidden border-indigo-200 bg-gradient-to-br from-white via-indigo-50/20 to-white shadow-sm dark:border-indigo-950 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <BrainCircuit className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Diagnóstico de Dificuldades & Heatmap Pedagógico (IA)
              </CardTitle>
              <p className="text-xs text-slate-500">
                Identificação automática de conteúdos com maior taxa de erro e intervenção imediata
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {diagnostics.filter((d) => d.status === "critical").length} Tópico(s) Crítico(s)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {diagnostics.map((diag) => {
            const isCritical = diag.status === "critical";
            const isWarning = diag.status === "warning";
            const hasStudents = diag.studentsNeedingHelp.length > 0;
            const successMsg = feedback[diag.topic];

            return (
              <div
                key={diag.topic}
                className={cn(
                  "flex flex-col justify-between rounded-xl border p-3.5 shadow-sm transition-all",
                  isCritical
                    ? "border-rose-200 bg-rose-50/40 dark:border-rose-950 dark:bg-rose-950/20"
                    : isWarning
                      ? "border-amber-200 bg-amber-50/40 dark:border-amber-950 dark:bg-amber-950/20"
                      : "border-emerald-200 bg-emerald-50/30 dark:border-emerald-950 dark:bg-emerald-950/20"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      {diag.className}
                    </span>
                    <Badge
                      variant={isCritical ? "danger" : isWarning ? "warning" : "success"}
                      className="text-[10px] py-0"
                    >
                      {diag.errorRate}% de Erro
                    </Badge>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {diag.topic}
                  </h3>

                  {/* Heatmap Bar */}
                  <div className="mt-2.5 space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isCritical
                            ? "bg-rose-500"
                            : isWarning
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        )}
                        style={{ width: `${diag.errorRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Alunos que precisam de ajuda */}
                  <div className="mt-3 text-xs">
                    {hasStudents ? (
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[11px]">
                          <Users className="h-3.5 w-3.5 text-slate-500" />
                          {diag.studentsNeedingHelp.length} aluno(s) com nota baixa:
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {diag.studentsNeedingHelp.slice(0, 3).map((s) => (
                            <span
                              key={s.id}
                              className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-300"
                            >
                              {s.name.split(" ")[0]} ({s.score.toFixed(1)})
                            </span>
                          ))}
                          {diag.studentsNeedingHelp.length > 3 && (
                            <span className="text-[10px] text-slate-500">
                              +{diag.studentsNeedingHelp.length - 3} mais
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Turma com ótimo domínio do conteúdo!
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100/80 pt-2.5 dark:border-slate-800">
                  {successMsg ? (
                    <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {successMsg}
                    </p>
                  ) : hasStudents ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleCreateReinforcement(diag)}
                      className="w-full gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-[11px] font-bold text-white shadow hover:from-indigo-700 hover:to-purple-700"
                    >
                      <Sparkles className="h-3 w-3" />
                      {isPending ? "Gerando Reforço..." : "Gerar Reforço com IA"}
                    </Button>
                  ) : (
                    <span className="text-[10px] text-slate-400 block text-center">
                      Nenhuma intervenção necessária
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
