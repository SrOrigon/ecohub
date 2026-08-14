import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUESTION_TYPE_LABELS, parseOptions } from "@/lib/exercises";
import { BarChart3 } from "lucide-react";

type Question = {
  id: string;
  prompt: string;
  type: string;
  points: number;
  options: string | null;
};

type Answer = {
  questionId: string;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
};

type Submission = {
  status: string;
  answers: Answer[];
};

export function ExerciseQuestionStats({
  questions,
  submissions,
}: {
  questions: Question[];
  submissions: Submission[];
}) {
  const graded = submissions.filter((s) => s.status === "graded");
  if (graded.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          Desempenho por questão ({graded.length} corrigida(s))
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((q, index) => {
          const answers = graded.flatMap((s) =>
            s.answers.filter((a) => a.questionId === q.id)
          );
          const correct = answers.filter((a) => a.isCorrect === true).length;
          const pct = answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0;
          const avgPts =
            answers.length > 0
              ? answers.reduce((s, a) => s + (a.pointsAwarded ?? 0), 0) / answers.length
              : 0;

          return (
            <div key={q.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-indigo-600">
                    Questão {index + 1} · {QUESTION_TYPE_LABELS[q.type as keyof typeof QUESTION_TYPE_LABELS] ?? q.type} · {q.points} pts
                  </p>
                  <p className="mt-1 text-sm text-slate-800">{q.prompt}</p>
                  {q.type === "choice" && (
                    <p className="mt-1 text-xs text-slate-500">
                      Gabarito: {parseOptions(q.options).find((o) => o.isCorrect)?.text ?? " - "}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-indigo-700">{pct}% acerto</p>
                  <p className="text-xs text-slate-500">média {avgPts.toFixed(1)} pts</p>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
