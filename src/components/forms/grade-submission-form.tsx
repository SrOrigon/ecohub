"use client";

import { useActionState, useState } from "react";
import { gradeSubmissionAction } from "@/actions/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Textarea } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";
import { Badge } from "@/components/ui/badge";
import { parseOptions } from "@/lib/exercises";
import { CheckCircle2, Wand2 } from "lucide-react";

type Answer = {
  id: string;
  questionId: string;
  textAnswer: string | null;
  selectedOptionId: string | null;
  pointsAwarded: number | null;
};

type Question = {
  id: string;
  prompt: string;
  type: string;
  options: string | null;
  points: number;
};

export function GradeSubmissionForm({
  submissionId,
  studentName,
  questions,
  answers,
  feedback: initialFeedback,
}: {
  submissionId: string;
  studentName: string;
  questions: Question[];
  answers: Answer[];
  feedback?: string | null;
}) {
  const [grades, setGrades] = useState<Record<string, number>>(() => {
    const g: Record<string, number> = {};
    for (const a of answers) {
      const q = questions.find((qu) => qu.id === a.questionId);
      if (a.pointsAwarded != null) {
        g[a.questionId] = a.pointsAwarded;
      } else if (q?.type === "choice") {
        const opts = parseOptions(q.options);
        const correct = opts.find((o) => o.isCorrect);
        g[a.questionId] = a.selectedOptionId === correct?.id ? q.points : 0;
      } else {
        g[a.questionId] = 0;
      }
    }
    return g;
  });

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const gradesJson = JSON.stringify(
        Object.fromEntries(
          Object.entries(grades).map(([questionId, points]) => [
            questionId,
            { points, isCorrect: points > 0 },
          ])
        )
      );
      formData.set("submissionId", submissionId);
      formData.set("gradesJson", gradesJson);
      return (await gradeSubmissionAction(formData)) ?? null;
    },
    null
  );

  const total = Object.values(grades).reduce((s, v) => s + v, 0);
  const max = questions.reduce((s, q) => s + q.points, 0);

  function applyGabarito() {
    const next: Record<string, number> = {};
    for (const q of questions) {
      const a = answers.find((an) => an.questionId === q.id);
      if (q.type === "choice") {
        const opts = parseOptions(q.options);
        const correct = opts.find((o) => o.isCorrect);
        next[q.id] = a?.selectedOptionId === correct?.id ? q.points : 0;
      } else {
        next[q.id] = grades[q.id] ?? 0;
      }
    }
    setGrades(next);
  }

  function setAllPoints(value: "max" | "zero") {
    const next: Record<string, number> = {};
    for (const q of questions) {
      next[q.id] = value === "max" ? q.points : 0;
    }
    setGrades(next);
  }

  if (state?.success) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
        <div>
          <p className="font-semibold text-emerald-900">{studentName}  -  corrigido!</p>
          <p className="text-sm text-emerald-800">
            Nota {total.toFixed(1)}/{max}. XP e moedas enviados ao aluno.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-xl border-2 border-amber-100 bg-amber-50/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{studentName}</p>
          <p className="text-xs text-slate-500">Aguardando sua correção</p>
        </div>
        <Badge variant="warning" className="text-base">{total.toFixed(1)} / {max} pts</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={applyGabarito} className="gap-1">
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          Aplicar gabarito (múltipla escolha)
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setAllPoints("max")}>
          Nota máxima
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAllPoints("zero")}>
          Zerar
        </Button>
      </div>

      {questions.map((q, i) => {
        const answer = answers.find((a) => a.questionId === q.id);
        const opts = parseOptions(q.options);
        const isCorrectChoice =
          q.type === "choice" &&
          answer?.selectedOptionId === opts.find((o) => o.isCorrect)?.id;

        return (
          <div key={q.id} className="space-y-2 rounded-lg border border-white bg-white p-3">
            <p className="text-sm font-medium">{i + 1}. {q.prompt}</p>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium text-slate-500">Resposta: </span>
              {q.type === "choice"
                ? opts.find((o) => o.id === answer?.selectedOptionId)?.text ?? " - "
                : answer?.textAnswer ?? " - "}
            </p>
            {q.type === "choice" && (
              <p className="text-xs text-slate-500">
                Gabarito: {opts.find((o) => o.isCorrect)?.text ?? " - "}
                {isCorrectChoice && (
                  <span className="ml-2 font-medium text-emerald-600">✓ Correta</span>
                )}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Label htmlFor={`pts-${q.id}`} className="shrink-0 text-sm">
                Pontos (máx. {q.points})
              </Label>
              <Input
                id={`pts-${q.id}`}
                type="number"
                step="0.5"
                min={0}
                max={q.points}
                value={grades[q.id] ?? 0}
                onChange={(e) =>
                  setGrades((prev) => ({
                    ...prev,
                    [q.id]: Math.min(q.points, Math.max(0, parseFloat(e.target.value) || 0)),
                  }))
                }
                className="w-24"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setGrades((prev) => ({ ...prev, [q.id]: q.points }))}
              >
                Máx
              </Button>
            </div>
          </div>
        );
      })}

      <div>
        <Label htmlFor={`feedback-${submissionId}`}>Mensagem para o aluno</Label>
        <Textarea
          id={`feedback-${submissionId}`}
          name="feedback"
          defaultValue={initialFeedback ?? ""}
          placeholder="Ex.: Ótimo trabalho! Revise a questão 2 sobre frações."
          rows={2}
        />
      </div>

      <FormMessage message={state} />
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Salvando..." : "Lançar nota e avisar o aluno"}
      </Button>
    </form>
  );
}
