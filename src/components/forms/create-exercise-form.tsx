"use client";

import { useActionState, useState, useTransition } from "react";
import { createExerciseAction } from "@/actions/exercises";
import { generateExerciseQuestionsAction } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";
import { Modal } from "@/components/ui/modal";
import type { QuestionType } from "@/lib/exercises";
import { ChevronLeft, ChevronRight, PenLine, Sparkles } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
}

type DraftQuestion = {
  prompt: string;
  type: QuestionType;
  points: number;
  options: { id: string; text: string; isCorrect: boolean }[];
};

function newQuestion(type: QuestionType = "choice"): DraftQuestion {
  return {
    prompt: "",
    type,
    points: 1,
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

export function CreateExerciseForm({
  classes,
  presets = DEFAULT_PRESETS,
  subjects = [],
}: {
  classes: ClassOption[];
  presets?: Preset[];
  subjects?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [questions, setQuestions] = useState<DraftQuestion[]>([newQuestion()]);
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

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      formData.set("questionsJson", JSON.stringify(questions));
      formData.set("xpReward", String(rewards.xp));
      formData.set("coinReward", String(rewards.coins));
      formData.set("maxPoints", String(rewards.maxPoints));
      const result = await createExerciseAction(formData);
      if (result.success) {
        setOpen(false);
        setStep(1);
        setQuestions([newQuestion()]);
        setRewards({ xp: mid.xp, coins: mid.coins, maxPoints: mid.points });
      }
      return result;
    },
    null
  );

  function updateQuestion(i: number, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  function closeModal() {
    setOpen(false);
    setStep(1);
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
        setQuestions(
          result.questions.map((q) => ({
            prompt: q.prompt,
            type: q.type,
            points: q.points,
            options: q.options.length ? q.options : newQuestion("choice").options,
          }))
        );
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="lg" className="gap-2">
        <PenLine className="h-4 w-4" aria-hidden="true" />
        Publicar para a turma
      </Button>
      <Modal open={open} onClose={closeModal} title="Nova atividade">
        <div className="mb-4 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full ${s <= step ? "bg-indigo-600" : "bg-slate-200"}`}
              aria-hidden="true"
            />
          ))}
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Passo {step} de 3 —{" "}
          {step === 1 ? "Informações básicas" : step === 2 ? "Recompensas" : "Questões"}
        </p>

        <form action={formAction} className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <Label htmlFor="title">Título da atividade</Label>
                <Input id="title" name="title" required placeholder="Ex.: Frações — exercício da semana" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="kind">Tipo</Label>
                  <Select id="kind" name="kind" defaultValue="homework">
                    <option value="homework">Exercício de casa</option>
                    <option value="exam">Prova</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="classId">Turma</Label>
                  <Select id="classId" name="classId" required>
                    <option value="">Selecione a turma...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Instruções para os alunos</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Explique o que fazer, materiais necessários, etc."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Prazo de entrega</Label>
                <Input id="dueDate" name="dueDate" type="datetime-local" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-slate-600">Escolha um preset ou ajuste manualmente:</p>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRewards({ xp: p.xp, coins: p.coins, maxPoints: p.points })}
                  >
                    {p.label}: {p.xp} XP · {p.coins} moedas
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="maxPoints">Pontuação máxima</Label>
                  <Input
                    id="maxPoints"
                    name="maxPoints"
                    type="number"
                    step="0.5"
                    value={rewards.maxPoints}
                    onChange={(e) => setRewards((r) => ({ ...r, maxPoints: parseFloat(e.target.value) || 10 }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="xpReward">XP ao concluir</Label>
                  <Input
                    id="xpReward"
                    name="xpReward"
                    type="number"
                    value={rewards.xp}
                    onChange={(e) => setRewards((r) => ({ ...r, xp: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="coinReward">Moedas</Label>
                  <Input
                    id="coinReward"
                    name="coinReward"
                    type="number"
                    value={rewards.coins}
                    onChange={(e) => setRewards((r) => ({ ...r, coins: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
              </div>
              <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                Quiz só com múltipla escolha = correção automática e XP na hora.
                Com respostas abertas, você corrige e os alunos ganham XP proporcional à nota.
              </p>
            </>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-900">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Gerar com EduHub IA (local, sem API)
                </p>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <Input
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Tema, ex.: frações equivalentes"
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
                    {aiPending ? "Gerando…" : "Gerar questões"}
                  </Button>
                </div>
                {aiError && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {aiError}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">Questões ({questions.length})</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuestions((qs) => [...qs, newQuestion()])}
                >
                  + Adicionar
                </Button>
              </div>
              {questions.map((q, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-indigo-700">Q{i + 1}</span>
                    <Select
                      value={q.type}
                      onChange={(e) =>
                        updateQuestion(i, {
                          type: e.target.value as QuestionType,
                          options: e.target.value === "choice" ? newQuestion("choice").options : [],
                        })
                      }
                      className="w-full min-w-0 sm:w-auto sm:min-w-[10rem]"
                    >
                      <option value="choice">Múltipla escolha</option>
                      <option value="text">Resposta aberta</option>
                    </Select>
                    <Input
                      type="number"
                      step="0.5"
                      className="w-20"
                      value={q.points}
                      onChange={(e) => updateQuestion(i, { points: parseFloat(e.target.value) || 1 })}
                      aria-label="Pontos"
                    />
                    <span className="text-xs text-slate-500">pts</span>
                    {questions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                  <Input
                    value={q.prompt}
                    onChange={(e) => updateQuestion(i, { prompt: e.target.value })}
                    placeholder="Digite o enunciado..."
                    required
                  />
                  {q.type === "choice" &&
                    q.options.map((opt, oi) => (
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
                        <span className="w-6 text-sm font-medium text-slate-500">
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
                          placeholder="Texto da alternativa"
                        />
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}

          <FormMessage message={state} />

          <div className="mobile-action-row pt-2">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} className="w-full gap-1 sm:w-auto">
                <ChevronLeft className="h-4 w-4" /> Voltar
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" className="w-full gap-1 sm:ml-auto sm:w-auto" onClick={() => setStep((s) => s + 1)}>
                Continuar <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={pending} className="w-full sm:ml-auto sm:w-auto">
                {pending ? "Publicando..." : "Publicar para a turma"}
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
