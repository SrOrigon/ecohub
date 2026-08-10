"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { EXERCISE_KIND_LABELS } from "@/lib/exercises";
import {
  ExerciseRewardPills,
  ExerciseStatusBadge,
  getStudentExerciseStatus,
} from "@/components/exercises/exercise-status-badge";
import { PenLine, ChevronRight, AlertTriangle } from "lucide-react";

type ExerciseItem = {
  id: string;
  title: string;
  kind: string;
  maxPoints: number;
  xpReward: number;
  coinReward: number;
  dueDate: Date | null;
  isActive: boolean;
  classGroup: { name: string } | null;
  questions: unknown[];
  submissions: {
    status: string;
    score: number | null;
    maxScore: number | null;
  }[];
};

const tabs = [
  { id: "pending", label: "Para fazer" },
  { id: "overdue", label: "Atrasados" },
  { id: "submitted", label: "Enviados" },
  { id: "graded", label: "Corrigidos" },
] as const;

export function StudentExercisesList({ exercises }: { exercises: ExerciseItem[] }) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("pending");

  const enriched = exercises.map((ex) => {
    const sub = ex.submissions[0];
    const status = getStudentExerciseStatus(sub, ex.dueDate, !!sub);
    return { ...ex, sub, status };
  });

  const filtered = enriched.filter((ex) => ex.status === tab);

  const counts = {
    pending: enriched.filter((e) => e.status === "pending").length,
    overdue: enriched.filter((e) => e.status === "overdue").length,
    submitted: enriched.filter((e) => e.status === "submitted").length,
    graded: enriched.filter((e) => e.status === "graded").length,
  };

  const emptyMessages: Record<(typeof tabs)[number]["id"], string> = {
    pending: "Nada pendente — você está em dia!",
    overdue: "Nenhum exercício com prazo encerrado.",
    submitted: "Nenhuma entrega aguardando correção.",
    graded: "Ainda não há exercícios corrigidos.",
  };

  return (
    <div className="space-y-4">
      <div className="touch-scroll-x flex gap-2 pb-1" role="tablist" aria-label="Filtrar exercícios">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium min-h-11 transition-colors ${
              tab === t.id
                ? t.id === "overdue"
                  ? "bg-red-600 text-white"
                  : "bg-[color:var(--school-primary)] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t.label} ({counts[t.id]})
          </button>
        ))}
      </div>

      {counts.overdue > 0 && tab !== "overdue" && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Você tem <strong>{counts.overdue}</strong> atividade(s) com prazo encerrado. Fale com seu professor.
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <PenLine className="mx-auto mb-3 h-10 w-10 text-slate-400" aria-hidden="true" />
          <p className="font-semibold text-slate-800">{emptyMessages[tab]}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((ex) => (
            <Card
              key={ex.id}
              className={`kid-card border-2 transition-shadow hover:shadow-md ${
                ex.status === "overdue" ? "border-red-200 bg-red-50/30" : "border-indigo-100"
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-xl">{ex.title}</CardTitle>
                    <p className="mt-1 text-base text-slate-600">
                      {EXERCISE_KIND_LABELS[ex.kind as keyof typeof EXERCISE_KIND_LABELS] ?? ex.kind}
                      {ex.classGroup && ` · ${ex.classGroup.name}`}
                    </p>
                  </div>
                  <ExerciseStatusBadge
                    status={ex.status}
                    score={ex.sub?.score}
                    maxScore={ex.sub?.maxScore}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ExerciseRewardPills xp={ex.xpReward} coins={ex.coinReward} points={ex.maxPoints} />
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <span>{ex.questions.length} questão(ões)</span>
                  {ex.dueDate && (
                    <span className={ex.status === "overdue" ? "font-semibold text-red-700" : ""}>
                      Prazo: {formatDate(ex.dueDate)}
                    </span>
                  )}
                </div>
                <Link href={`/dashboard/exercicios/${ex.id}`} className="block">
                  <Button
                    size="lg"
                    variant={ex.status === "overdue" ? "outline" : "default"}
                    className="w-full gap-2"
                  >
                    {ex.status === "pending"
                      ? "Começar agora"
                      : ex.status === "overdue"
                        ? "Ver detalhes"
                        : ex.status === "graded"
                          ? "Ver resultado"
                          : "Ver entrega"}
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
