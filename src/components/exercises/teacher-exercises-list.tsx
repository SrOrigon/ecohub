"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { EXERCISE_KIND_LABELS, personalizationTagLabel, EXERCISE_AUDIENCE_LABELS } from "@/lib/exercises";
import { ExerciseRewardPills } from "@/components/exercises/exercise-status-badge";
import { ChevronRight, AlertCircle } from "lucide-react";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { deleteExerciseAction } from "@/actions/exercises";

type ExerciseItem = {
  id: string;
  title: string;
  kind: string;
  audienceType?: string;
  personalizationTag?: string | null;
  maxPoints: number;
  xpReward: number;
  coinReward: number;
  dueDate: Date | null;
  isActive: boolean;
  classGroup: { name: string } | null;
  teacher: { fullName: string };
  questions: unknown[];
  submissions: { status: string }[];
  studentTargets?: Array<{ studentId?: string; student?: { user: { fullName: string } } }>;
};

export function TeacherExercisesList({ exercises }: { exercises: ExerciseItem[] }) {
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  const pendingCount = useMemo(
    () => exercises.filter((ex) => ex.submissions.some((s) => s.status === "submitted")).length,
    [exercises]
  );

  const list = useMemo(
    () =>
      showPendingOnly
        ? exercises.filter((ex) => ex.submissions.some((s) => s.status === "submitted"))
        : exercises,
    [exercises, showPendingOnly]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={!showPendingOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowPendingOnly(false)}
        >
          Todos ({exercises.length})
        </Button>
        <Button
          type="button"
          variant={showPendingOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowPendingOnly(true)}
          className="gap-1"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          Precisam correção ({pendingCount})
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((ex) => {
          const pending = ex.submissions.filter((s) => s.status === "submitted").length;
          const graded = ex.submissions.filter((s) => s.status === "graded").length;

          return (
            <Card key={ex.id} className={pending > 0 ? "border-amber-200 ring-1 ring-amber-100" : ""}>
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="text-lg">{ex.title}</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    {EXERCISE_KIND_LABELS[ex.kind as keyof typeof EXERCISE_KIND_LABELS] ?? ex.kind}
                    {ex.classGroup && ` · ${ex.classGroup.name}`}
                    {ex.audienceType === "personalized" && " · Personalizado"}
                  </p>
                  {ex.audienceType === "personalized" && (
                    <p className="mt-1 text-xs text-indigo-700">
                      {personalizationTagLabel(ex.personalizationTag ?? null) ?? "Alunos selecionados"}
                      {ex.studentTargets && ex.studentTargets.length > 0
                        ? ` · ${ex.studentTargets.length} aluno(s)`
                        : ""}
                    </p>
                  )}
                </div>
                <ExerciseRewardPills xp={ex.xpReward} coins={ex.coinReward} points={ex.maxPoints} />
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="default">{graded} corrigida(s)</Badge>
                  {pending > 0 && (
                    <Badge variant="warning">{pending} para corrigir</Badge>
                  )}
                  {!ex.isActive && <Badge variant="danger">Inativo</Badge>}
                  {ex.audienceType === "personalized" && (
                    <Badge variant="secondary">
                      {EXERCISE_AUDIENCE_LABELS.personalized}
                    </Badge>
                  )}
                  {ex.dueDate && (
                    <span className="text-slate-500">Prazo: {formatDate(ex.dueDate)}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/dashboard/exercicios/${ex.id}`}>
                    <Button variant={pending > 0 ? "default" : "outline"} size="sm" className="gap-1">
                      {pending > 0 ? "Corrigir agora" : "Gerenciar"}
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Link>
                  <DeleteConfirmButton
                    label="Excluir"
                    confirmMessage={`Excluir o exercício "${ex.title}" e todas as entregas? Esta ação não pode ser desfeita.`}
                    hiddenFields={{ id: ex.id }}
                    action={deleteExerciseAction}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
