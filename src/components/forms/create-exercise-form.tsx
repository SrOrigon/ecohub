"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { createExerciseAction } from "@/actions/exercises";
import { generateExerciseQuestionsAction } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";
import { Modal } from "@/components/ui/modal";
import type { QuestionType } from "@/lib/exercises";
import {
  flashcardBackOption,
  trueFalseOptions,
  QUESTION_TYPE_LABELS,
} from "@/lib/exercises";
import { ChevronLeft, ChevronRight, PenLine, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

interface ClassOption {
  id: string;
  name: string;
}

type DraftQuestion = {
  prompt: string;
  type: QuestionType;
  points: number;
  xpReward: number;
  options: { id: string; text: string; isCorrect: boolean }[];
};

function newQuestion(type: QuestionType = "choice", points = 2, xpReward = 20): DraftQuestion {
  if (type === "true_false") {
    return { prompt: "", type, points, xpReward, options: trueFalseOptions() };
  }
  if (type === "flashcard") {
    return { prompt: "", type, points, xpReward, options: flashcardBackOption() };
  }
  if (type === "text") {
    return { prompt: "", type, points, xpReward, options: [] };
  }
  return {
    prompt: "",
    type,
    points,
    xpReward,
    options: [
      { id: "a", text: "", isCorrect: true },
      { id: "b", text: "", isCorrect: false },
    ],
  };
}

type Preset = { label: string; xp: number; coins: number; points: number };

const DEFAULT_PRESETS: Preset[] = [
  { label: "Leve", xp: 50, coins: 15, points: 5 },
  { label: "Médio", xp: 80, coins: 25, points: 10 },
  { label: "Prova", xp: 150, coins: 40, points: 10 },
];

const EXAM_PRESETS: Preset[] = [
  { label: "Avaliação Parcial", xp: 100, coins: 30, points: 5 },
  { label: "Prova Bimestral", xp: 200, coins: 50, points: 10 },
  { label: "Simulado Oficial", xp: 250, coins: 60, points: 10 },
];

function parseBoundedInt(value: string, fallback = 0) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return fallback;
  const parsed = parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoundedFloat(value: string, fallback = 0) {
  const normalized = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function CreateExerciseForm({
  classes,
  presets = DEFAULT_PRESETS,
  subjects = [],
  trigger,
  hideDefaultTrigger = false,
  defaultQuestionType = "choice",
  defaultTitle = "",
  defaultKind = "homework",
  modalTitle = "Nova atividade pedagógica",
}: {
  classes: ClassOption[];
  presets?: Preset[];
  subjects?: string[];
  trigger?: ReactNode;
  hideDefaultTrigger?: boolean;
  defaultQuestionType?: QuestionType;
  defaultTitle?: string;
  defaultKind?: "homework" | "exam";
  modalTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<"homework" | "exam">(defaultKind);
  const [basics, setBasics] = useState({
    title: defaultTitle,
    classId: "",
    description: "",
    dueDate: "",
  });
  const [clientError, setClientError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DraftQuestion[]>([newQuestion(defaultQuestionType)]);
  const mid = presets[1] ?? presets[0] ?? DEFAULT_PRESETS[1];
  const [rewards, setRewards] = useState({
    xp: mid.xp,
    coins: mid.coins,
    maxPoints: mid.points,
  });
  const [aiTopic, setAiTopic] = useState("");
  const [aiSubject, setAiSubject] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPending, startAiTransition] = useTransition();

  const effectiveAiSubject = aiSubject && subjects.includes(aiSubject) ? aiSubject : (subjects[0] ?? "");

  const totalQuestionPoints = useMemo(
    () => questions.reduce((s, q) => s + (Number(q.points) || 0), 0),
    [questions]
  );
  const totalQuestionXp = useMemo(
    () => questions.reduce((s, q) => s + (Number(q.xpReward) || 0), 0),
    [questions]
  );

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      formData.set("title", basics.title.trim());
      formData.set("classId", basics.classId);
      formData.set("kind", kind);
      formData.set("description", basics.description.trim());
      formData.set("dueDate", basics.dueDate);
      formData.set("questionsJson", JSON.stringify(questions));
      formData.set("xpReward", String(rewards.xp));
      formData.set("coinReward", String(rewards.coins));
      formData.set("maxPoints", String(rewards.maxPoints));
      const result = await createExerciseAction(formData);
      if (result.success) {
        setOpen(false);
        setStep(1);
        setBasics({ title: defaultTitle, classId: "", description: "", dueDate: "" });
        setClientError(null);
        setQuestions([newQuestion()]);
        setRewards({ xp: mid.xp, coins: mid.coins, maxPoints: mid.points });
      }
      return result;
    },
    null
  );

  function validateStep1() {
    if (!basics.title.trim()) return "Informe o título da atividade.";
    if (!basics.classId) return "Selecione uma turma.";
    return null;
  }

  function validateQuestions() {
    if (questions.length === 0) return "Adicione pelo menos uma questão.";
    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      if (!question.prompt.trim()) {
        return `A questão ${index + 1} precisa de enunciado.`;
      }
      if (question.type === "choice") {
        const filledOptions = question.options.filter((option) => option.text.trim());
        if (filledOptions.length < 2) {
          return `A questão ${index + 1} precisa de pelo menos duas alternativas.`;
        }
        if (!question.options.some((option) => option.isCorrect && option.text.trim())) {
          return `Marque a alternativa correta na questão ${index + 1}.`;
        }
      }
      if (question.type === "flashcard" && !question.options[0]?.text.trim()) {
        return `Informe o verso do cartão na questão ${index + 1}.`;
      }
    }
    return null;
  }

  function goToNextStep() {
    if (step === 1) {
      const error = validateStep1();
      if (error) {
        setClientError(error);
        return;
      }
    }
    if (step === 2 && (rewards.maxPoints <= 0 || Number.isNaN(rewards.maxPoints))) {
      setClientError("Informe uma pontuação máxima válida.");
      return;
    }
    setClientError(null);
    setStep((current) => current + 1);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const step1Error = validateStep1();
    if (step1Error) {
      setClientError(step1Error);
      setStep(1);
      return;
    }
    const questionsError = validateQuestions();
    if (questionsError) {
      setClientError(questionsError);
      return;
    }
    setClientError(null);
    const formData = new FormData(event.currentTarget);
    formAction(formData);
  }

  function updateQuestion(i: number, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  function openModal() {
    setOpen(true);
    setStep(1);
    setKind(defaultKind);
    setBasics({ title: defaultTitle, classId: "", description: "", dueDate: "" });
    setClientError(null);
    setQuestions([newQuestion(defaultQuestionType)]);
  }

  function closeModal() {
    setOpen(false);
    setStep(1);
    setClientError(null);
  }

  function distributeXpEvenly() {
    if (questions.length === 0) return;
    const perQuestion = Math.max(1, Math.round(rewards.xp / questions.length));
    setQuestions((qs) => qs.map((q) => ({ ...q, xpReward: perQuestion })));
  }

  function syncPointsFromQuestions() {
    setRewards((r) => ({ ...r, maxPoints: totalQuestionPoints }));
  }

  function syncXpFromQuestions() {
    setRewards((r) => ({ ...r, xp: totalQuestionXp }));
  }

  function generateWithAi() {
    if (!aiTopic.trim()) {
      setAiError("Informe o tema das questões.");
      return;
    }
    setAiError(null);
    startAiTransition(async () => {
      const fd = new FormData();
      fd.set("topic", aiTopic);
      fd.set("subject", effectiveAiSubject);
      fd.set("count", "3");
      const result = await generateExerciseQuestionsAction(fd);
      if (result.error) {
        setAiError(result.error);
        return;
      }
      if (result.questions?.length) {
        const count = result.questions.length;
        const defaultXpPerQ = Math.max(5, Math.round(rewards.xp / count));
        setQuestions(
          result.questions.map((q) => ({
            prompt: q.prompt,
            type: q.type,
            points: q.points ?? 2,
            xpReward: defaultXpPerQ,
            options: q.options.length ? q.options : newQuestion("choice").options,
          }))
        );
      }
    });
  }

  return (
    <>
      {trigger ? (
        <button type="button" className="inline-flex border-0 bg-transparent p-0 text-left" onClick={openModal}>
          {trigger}
        </button>
      ) : hideDefaultTrigger ? null : (
        <Button onClick={openModal} size="lg" className="gap-2">
          <PenLine className="h-4 w-4" aria-hidden="true" />
          Publicar para a turma
        </Button>
      )}
      <Modal open={open} onClose={closeModal} title={modalTitle}>
        <div className="mb-4 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-all ${s <= step ? "bg-indigo-600" : "bg-slate-200"}`}
              aria-hidden="true"
            />
          ))}
        </div>
        <p className="mb-4 text-sm font-medium text-slate-600">
          Passo {step} de 3  - {" "}
          {step === 1 ? "Informações básicas" : step === 2 ? "Configurar Pontuação & Gamificação" : "Elaboração de Questões"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <Label htmlFor="title">Título da atividade</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="Ex.: Frações Equivalentes  -  Exercício Semanal"
                  value={basics.title}
                  onChange={(event) => setBasics((current) => ({ ...current, title: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="kind">Tipo de Atividade</Label>
                  <Select
                    id="kind"
                    name="kind"
                    value={kind}
                    onChange={(e) => {
                      const newKind = e.target.value as "homework" | "exam";
                      setKind(newKind);
                      if (newKind === "exam") {
                        setRewards({ xp: EXAM_PRESETS[1].xp, coins: EXAM_PRESETS[1].coins, maxPoints: EXAM_PRESETS[1].points });
                      }
                    }}
                  >
                    <option value="homework">Exercício de casa</option>
                    <option value="exam">Prova / Avaliação Oficial</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="classId">Turma</Label>
                  <Select
                    id="classId"
                    name="classId"
                    required
                    value={basics.classId}
                    onChange={(event) => setBasics((current) => ({ ...current, classId: event.target.value }))}
                  >
                    <option value="">Selecione a turma...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Instruções para os Alunos</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Explique o objetivo, critérios de correção ou materiais de apoio necessários..."
                  rows={3}
                  value={basics.description}
                  onChange={(event) => setBasics((current) => ({ ...current, description: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Prazo de entrega</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="datetime-local"
                  value={basics.dueDate}
                  onChange={(event) => setBasics((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {kind === "exam" && (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900 font-medium flex items-center gap-2">
                  <span>📝</span>
                  <span>
                    <strong>Modo Prova / Avaliação Oficial:</strong> As notas desta avaliação compõem o boletim oficial dos alunos no período letivo.
                  </span>
                </div>
              )}
              <p className="text-sm font-medium text-slate-700">
                Presets {kind === "exam" ? "de Prova Oficial" : "de Recompensa"} (ou personalize abaixo):
              </p>
              <div className="flex flex-wrap gap-2">
                {(kind === "exam" ? EXAM_PRESETS : presets).map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 border-indigo-200 hover:bg-indigo-50"
                    onClick={() => setRewards({ xp: p.xp, coins: p.coins, maxPoints: p.points })}
                  >
                    🎯 {p.label}: ⚡ {p.xp} XP · 🪙 {p.coins} moedas ({p.points} pts)
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="maxPoints">Pontuação Máxima (Conjunto)</Label>
                  <Input
                    id="maxPoints"
                    name="maxPoints"
                    type="number"
                    step="0.5"
                    value={rewards.maxPoints}
                    onChange={(e) => setRewards((r) => ({ ...r, maxPoints: parseBoundedFloat(e.target.value, 10) }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="xpReward">XP Total (Conjunto)</Label>
                  <Input
                    id="xpReward"
                    name="xpReward"
                    type="number"
                    value={rewards.xp}
                    onChange={(e) => setRewards((r) => ({ ...r, xp: parseBoundedInt(e.target.value, 0) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="coinReward">Moedas (Conjunto)</Label>
                  <Input
                    id="coinReward"
                    name="coinReward"
                    type="number"
                    value={rewards.coins}
                    onChange={(e) => setRewards((r) => ({ ...r, coins: parseBoundedInt(e.target.value, 0) }))}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-900">Sincronização Rápida de Valores</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={syncPointsFromQuestions}>
                    🎯 Usar Soma das Questões ({totalQuestionPoints} pts)
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={syncXpFromQuestions}>
                    ⚡ Usar Soma de XP das Questões ({totalQuestionXp} XP)
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <p>
                  <strong>Título:</strong> {basics.title.trim() || "—"}
                </p>
                <p>
                  <strong>Turma:</strong>{" "}
                  {classes.find((item) => item.id === basics.classId)?.name ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-900">
                  <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                  Gerador Automático de Questões (Ecohub IA)
                </p>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <Input
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Tema pedagógico (ex.: frações equivalentes)"
                    aria-label="Tema para gerar questões"
                  />
                  <Select
                    value={effectiveAiSubject}
                    onChange={(e) => setAiSubject(e.target.value)}
                    aria-label="Disciplina"
                    className="w-full min-w-0 sm:min-w-[8rem] sm:w-auto"
                    disabled={subjects.length === 0}
                    required
                  >
                    {subjects.length === 0 ? (
                      <option value="">Cadastre disciplinas</option>
                    ) : (
                      subjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))
                    )}
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={aiPending || subjects.length === 0 || !effectiveAiSubject}
                    onClick={generateWithAi}
                  >
                    {aiPending ? "Gerando…" : "Gerar 3 Questões"}
                  </Button>
                </div>
                {aiError && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {aiError}
                  </p>
                )}
              </div>

              {/* Live Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-100 p-3 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-3">
                  <span className="text-slate-700">🎯 Questões: <strong>{questions.length}</strong></span>
                  <span className="text-indigo-700">Pontos Soma: <strong>{totalQuestionPoints}</strong> / {rewards.maxPoints} pts</span>
                  <span className="text-amber-700">XP Soma: <strong>{totalQuestionXp}</strong> / {rewards.xp} XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={distributeXpEvenly} className="h-7 text-xs">
                    ⚡ Distribuir {rewards.xp} XP igualmente
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={syncPointsFromQuestions} className="h-7 text-xs">
                    🎯 Ajustar Pontos Máx.
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">Editor de Questões</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuestions((qs) => [...qs, newQuestion("choice", 2, Math.max(10, Math.round(rewards.xp / (qs.length + 1))))])}
                >
                  + Adicionar Questão
                </Button>
              </div>

              {questions.map((q, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                        Q{i + 1}
                      </span>
                      <Select
                        value={q.type}
                        onChange={(e) => {
                          const nextType = e.target.value as QuestionType;
                          updateQuestion(i, {
                            type: nextType,
                            options:
                              nextType === "true_false"
                                ? trueFalseOptions()
                                : nextType === "flashcard"
                                  ? flashcardBackOption()
                                  : nextType === "choice"
                                    ? newQuestion("choice").options
                                    : [],
                          });
                        }}
                        className="w-full min-w-0 sm:w-auto sm:min-w-[10rem]"
                      >
                        {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                          <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
                        ))}
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg">
                        <span className="text-xs font-semibold text-indigo-700">Pontos:</span>
                        <Input
                          type="number"
                          step="0.5"
                          className="h-7 w-16 text-center text-xs font-bold"
                          value={q.points}
                          onChange={(e) => updateQuestion(i, { points: parseBoundedFloat(e.target.value, 0) })}
                          min={0}
                          inputMode="decimal"
                          aria-label="Pontos da questão"
                        />
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                        <span className="text-xs font-semibold text-amber-700">⚡ XP:</span>
                        <Input
                          type="number"
                          className="h-7 w-16 text-center text-xs font-bold"
                          value={q.xpReward}
                          onChange={(e) => updateQuestion(i, { xpReward: parseBoundedInt(e.target.value, 0) })}
                          min={0}
                          inputMode="numeric"
                          aria-label="XP da questão"
                        />
                      </div>
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>

                  <Input
                    value={q.prompt}
                    onChange={(e) => updateQuestion(i, { prompt: e.target.value })}
                    placeholder={
                      q.type === "flashcard"
                        ? "Frente do cartão (pergunta ou termo)..."
                        : "Digite o enunciado da questão..."
                    }
                    required
                  />
                  {q.type === "choice" && (
                    <div className="space-y-2 pl-2 border-l-2 border-indigo-100">
                      <p className="text-xs font-medium text-slate-500">Alternativas (Selecione a resposta correta):</p>
                      {q.options.map((opt, oi) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${i}`}
                            checked={opt.isCorrect}
                            onChange={() =>
                              updateQuestion(i, {
                                options: q.options.map((o, j) => ({ ...o, isCorrect: j === oi })),
                              })
                            }
                            aria-label={`Gabarito alternativa ${oi + 1}`}
                          />
                          <span className="w-5 text-xs font-bold text-slate-600">
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <Input
                            value={opt.text}
                            onChange={(e) =>
                              updateQuestion(i, {
                                options: q.options.map((o, j) =>
                                  j === oi ? { ...o, text: e.target.value } : o
                                ),
                              })
                            }
                            placeholder={`Alternativa ${String.fromCharCode(65 + oi)}...`}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === "true_false" && (
                    <div className="space-y-2 pl-2 border-l-2 border-emerald-100">
                      <p className="text-xs font-medium text-slate-500">Resposta correta:</p>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              updateQuestion(i, {
                                options: trueFalseOptions(opt.id === "true" ? "true" : "false"),
                              })
                            }
                            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                              opt.isCorrect
                                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                                : "border-slate-200 text-slate-600 hover:border-emerald-300"
                            }`}
                          >
                            {opt.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {q.type === "flashcard" && (
                    <div className="space-y-2 pl-2 border-l-2 border-violet-100">
                      <p className="text-xs font-medium text-slate-500">Verso do cartão (resposta):</p>
                      <Input
                        value={q.options[0]?.text ?? ""}
                        onChange={(e) =>
                          updateQuestion(i, { options: flashcardBackOption(e.target.value) })
                        }
                        placeholder="Resposta ou definição que aparece ao virar o cartão..."
                        required
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {(clientError || state?.error) && (
            <p className="text-sm text-red-600" role="alert">
              {clientError ?? state?.error}
            </p>
          )}
          {state?.success && !clientError && <FormMessage message={state} />}

          <div className="mobile-action-row pt-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setClientError(null);
                  setStep((current) => current - 1);
                }}
                className="w-full gap-1 sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4" /> Voltar
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" className="w-full gap-1 sm:ml-auto sm:w-auto" onClick={goToNextStep}>
                Continuar <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={pending} className="w-full sm:ml-auto sm:w-auto">
                {pending ? "Publicando..." : "Publicar para a Turma"}
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
