"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, Circle, Clock, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type DayPlan } from "@/lib/weekly-study-planner";
import { playQuestCompleteSound } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

export function WeeklyStudyPlanner({
  initialPlan = [],
}: {
  initialPlan: DayPlan[];
}) {
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  function toggleTask(taskId: string) {
    const next = !completedTasks[taskId];
    if (next) {
      playQuestCompleteSound();
    }
    setCompletedTasks((prev) => ({ ...prev, [taskId]: next }));
  }

  const currentDayIndex = Math.min(5, Math.max(0, new Date().getDay() - 1)); // 0 = Seg, 5 = Sab

  return (
    <Card className="overflow-hidden border-indigo-200 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/10 shadow-sm dark:border-indigo-950 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-bold">
                Planner Semanal de Estudos com IA
              </CardTitle>
              <p className="text-xs text-slate-500">
                Distribuição equilibrada de tarefas e revisões ao longo da semana
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {initialPlan.reduce((s, d) => s + d.tasks.length, 0)} Blocos Programados
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {initialPlan.map((day, dIdx) => {
            const isToday = dIdx === currentDayIndex;
            return (
              <div
                key={day.dayName}
                className={cn(
                  "flex flex-col justify-between rounded-xl border p-3 shadow-sm transition-all",
                  isToday
                    ? "border-indigo-400 bg-indigo-50/80 shadow-md ring-2 ring-indigo-300/40 dark:border-indigo-800 dark:bg-indigo-950/40"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                )}
              >
                <div>
                  <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                    <span
                      className={cn(
                        "text-xs font-bold",
                        isToday ? "text-indigo-900 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {day.dayShort}
                    </span>
                    {isToday && (
                      <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                        Hoje
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 space-y-2">
                    {day.tasks.map((task) => {
                      const isDone = !!completedTasks[task.id];
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className={cn(
                            "w-full rounded-lg border p-2 text-left text-xs transition-all",
                            isDone
                              ? "border-emerald-200 bg-emerald-50 text-slate-400 line-through dark:border-emerald-900/60 dark:bg-emerald-950/30"
                              : "border-slate-100 bg-slate-50/70 text-slate-800 hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
                          )}
                        >
                          <div className="flex items-start gap-1.5">
                            {isDone ? (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                            )}
                            <p className="font-semibold line-clamp-2 leading-tight">
                              {task.title}
                            </p>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                            <span>⏱️ {task.durationMinutes}m</span>
                            <span className="font-bold text-amber-600">+{task.xpEstimate} XP</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-500 flex items-center justify-between dark:border-slate-800">
                  <span>Total: {day.totalMinutes}m</span>
                  <span className="font-bold text-indigo-600">+{day.totalXp} XP</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
