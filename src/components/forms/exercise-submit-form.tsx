"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseFlashcardBack, parseOptions, FLASHCARD_SELF_OPTIONS } from "@/lib/exercises";
import { useActionState } from "react";
import { submitExerciseAction } from "@/actions/exercises";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";
import { SaoVictoryOverlay } from "@/components/celebration/sao-victory-overlay";
import { ChevronLeft, ChevronRight, Send, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  prompt: string;
  type: string;
  options: string | null;
  points: number;
  xpReward?: number;
};

type Answer = { textAnswer?: string; selectedOptionId?: string };

function isAnswered(question: Question, answer: Answer | undefined) {
  if (question.type === "choice" || question.type === "true_false" || question.type === "flashcard") {
    return !!answer?.selectedOptionId;
  }
  return !!answer?.textAnswer?.trim();
}

function FlashcardStep({
  question,
  answer,
  onAnswer,
  kidFriendly,
}: {
  question: Question;
  answer: Answer | undefined;
  onAnswer: (id: string) => void;
  kidFriendly?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const back = parseFlashcardBack(question.options);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className={cn(
          "creator-flashcard w-full text-left transition-transform",
          flipped && "creator-flashcard-flipped",
          kidFriendly && "min-h-40"
        )}
      >
        <div className="creator-flashcard-inner">
          <div className="creator-flashcard-face creator-flashcard-front">
            <p className={cn("font-semibold text-slate-900", kidFriendly && "text-xl")}>{question.prompt}</p>
            <p className="mt-2 text-xs text-slate-500">Toque para virar</p>
          </div>
          <div className="creator-flashcard-face creator-flashcard-back">
            <p className={cn("font-medium text-violet-900", kidFriendly && "text-lg")}>{back || "—"}</p>
          </div>
        </div>
      </button>
      {flipped && (
        <div className="flex flex-wrap gap-2">
          {FLASHCARD_SELF_OPTIONS.map((opt) => {
            const selected = answer?.selectedOptionId === opt.id;
            return (
              <Button
                key={opt.id}
                type="button"
                variant={selected ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  opt.id === "knew" && selected && "bg-emerald-600 hover:bg-emerald-700"
                )}
                onClick={() => onAnswer(opt.id)}
              >
                {opt.text}
              </Button>
            );
          })}
        </div>
      )}
      {!flipped && (
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setFlipped(true)}>
          <RotateCcw className="h-4 w-4" /> Virar cartão
        </Button>
      )}
    </div>
  );
}

export function ExerciseSubmitForm({
  exerciseId,
  questions,
  readOnly = false,
  existingAnswers,
  kidFriendly = false,
}: {
  exerciseId: string;
  questions: Question[];
  readOnly?: boolean;
  existingAnswers?: Record<string, { textAnswer?: string | null; selectedOptionId?: string | null }>;
  kidFriendly?: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, { textAnswer?: string; selectedOptionId?: string }>>(
    () => {
      const init: Record<string, { textAnswer?: string; selectedOptionId?: string }> = {};
      for (const q of questions) {
        const ex = existingAnswers?.[q.id];
        init[q.id] = {
          textAnswer: ex?.textAnswer ?? undefined,
          selectedOptionId: ex?.selectedOptionId ?? undefined,
        };
      }
      return init;
    }
  );
  const [step, setStep] = useState(0);
  const [resultVisible, setResultVisible] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (
      _prev: {
        error?: string;
        success?: boolean;
        autoGraded?: boolean;
        score?: number | null;
        maxScore?: number;
      } | null,
      formData: FormData
    ) => {
      formData.set("exerciseId", exerciseId);
      formData.set("answersJson", JSON.stringify(answers));
      return (await submitExerciseAction(formData)) ?? null;
    },
    null
  );

  useEffect(() => {
    if (state?.success) setResultVisible(false);
  }, [state?.success]);

  const answeredCount = questions.filter((q) => isAnswered(q, answers[q.id])).length;
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  if (readOnly) {
    return (
      <div className="space-y-4">
        {questions.map((q, i) => {
          const a = existingAnswers?.[q.id];
          const opts = parseOptions(q.options);
          return (
            <div
              key={q.id}
              className={cn(
                "rounded-xl border p-4",
                kidFriendly ? "border-indigo-200 bg-indigo-50/30 text-lg" : "border-slate-200"
              )}
            >
              <p className="font-medium">{i + 1}. {q.prompt}</p>
              <p className="mt-2 text-slate-600">
                {q.type === "choice" || q.type === "true_false"
                  ? opts.find((o) => o.id === a?.selectedOptionId)?.text ?? " - "
                  : q.type === "flashcard"
                    ? a?.selectedOptionId === "knew"
                      ? "Eu sabia!"
                      : a?.selectedOptionId === "review"
                        ? "Vou revisar"
                        : " - "
                    : a?.textAnswer ?? " - "}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  if (state?.success) {
    const auto = "autoGraded" in state && state.autoGraded;
    return (
      <>
        <SaoVictoryOverlay
          open={!resultVisible}
          onProceed={() => {
            setResultVisible(true);
            router.refresh();
          }}
        />
        {resultVisible && (
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-6 py-8 text-center" role="status">
            <p className={cn("font-bold text-emerald-800", kidFriendly && "text-xl")}>
              {auto ? "Corrigido na hora!" : "Respostas enviadas com sucesso!"}
            </p>
            <p className="mt-2 text-slate-700">
              {auto && "score" in state && state.score != null && "maxScore" in state
                ? `Sua nota: ${Number(state.score).toFixed(1)}/${Number(state.maxScore).toFixed(1)} pts. XP e moedas já foram creditados!`
                : "Seu professor vai corrigir em breve. Você receberá uma notificação quando a nota sair."}
            </p>
          </div>
        )}
      </>
    );
  }

  const q = questions[step];
  const opts = q ? parseOptions(q.options) : [];

  function canAdvance() {
    if (!q) return false;
    return isAnswered(q, answers[q.id]);
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-sm text-slate-600">
          <span>Progresso: {answeredCount}/{questions.length} questões</span>
          <span>{progress}%</span>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {q && (
        <div
          className={cn(
            "rounded-2xl border-2 p-5",
            kidFriendly ? "border-indigo-200 bg-white shadow-sm" : "border-slate-200"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <p className="text-sm font-semibold text-indigo-600">
              Questão {step + 1} de {questions.length}
            </p>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-800">
                🎯 {q.points} {q.points === 1 ? "ponto" : "pontos"}
              </span>
              {q.xpReward != null && q.xpReward > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
                  ⚡ +{q.xpReward} XP
                </span>
              )}
            </div>
          </div>
          {q.type !== "flashcard" && (
            <Label className={cn("mt-2 block", kidFriendly ? "text-xl font-bold" : "text-base font-medium")}>
              {q.prompt}
            </Label>
          )}

          {q.type === "choice" || q.type === "true_false" ? (
            <div className="mt-4 space-y-2">
              {opts.map((opt, oi) => {
                const selected = answers[q.id]?.selectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: { ...prev[q.id], selectedOptionId: opt.id },
                      }))
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors",
                      selected
                        ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200"
                        : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50",
                      kidFriendly && "min-h-14 text-lg",
                      q.type === "true_false" && "justify-center font-semibold"
                    )}
                  >
                    {q.type === "choice" && (
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {String.fromCharCode(65 + oi)}
                      </span>
                    )}
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          ) : q.type === "flashcard" ? (
            <div className="mt-4">
              <FlashcardStep
                question={q}
                answer={answers[q.id]}
                kidFriendly={kidFriendly}
                onAnswer={(id) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [q.id]: { ...prev[q.id], selectedOptionId: id },
                  }))
                }
              />
            </div>
          ) : (
            <Textarea
              className={cn("mt-4", kidFriendly && "min-h-32 text-lg")}
              value={answers[q.id]?.textAnswer ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [q.id]: { ...prev[q.id], textAnswer: e.target.value },
                }))
              }
              placeholder="Escreva sua resposta aqui..."
              rows={kidFriendly ? 5 : 4}
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        {step < questions.length - 1 ? (
          <Button
            type="button"
            className="ml-auto gap-1"
            disabled={!canAdvance()}
            onClick={() => setStep((s) => s + 1)}
          >
            Próxima <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={pending || answeredCount < questions.length}
            className="ml-auto gap-2"
            size={kidFriendly ? "lg" : "default"}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {pending ? "Enviando..." : "Enviar tudo"}
          </Button>
        )}
      </div>

      <div className="touch-scroll-x flex gap-2 pb-1">
        {questions.map((question, i) => {
          const done = isAnswered(question, answers[question.id]);
          const active = i === step;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                active
                  ? "bg-[color:var(--school-primary)] text-white ring-2 ring-[color:var(--school-primary-ring)]"
                  : done
                    ? "bg-[color:var(--school-primary-soft)] text-[color:var(--school-primary)]"
                    : "bg-slate-200 text-slate-600",
                kidFriendly && "min-h-12 min-w-12 text-base"
              )}
              aria-label={`Ir para questão ${i + 1}`}
              aria-current={active ? "step" : undefined}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <FormMessage message={state} />
    </form>
  );
}
