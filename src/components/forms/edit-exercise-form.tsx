"use client";

import { useActionState, useMemo, useState } from "react";
import { updateExerciseAction } from "@/actions/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { ToggleExerciseButton } from "@/components/forms/toggle-exercise-button";
import { ExerciseStudentTargetsField } from "@/components/forms/exercise-student-targets-field";
import type { ExerciseAudienceType } from "@/lib/exercise-audience";
import {
  newQuestion,
  parseBoundedFloat,
  parseBoundedInt,
  validateDraftQuestions,
  type DraftQuestion,
} from "@/lib/exercise-draft";
import {
  flashcardBackOption,
  parseOptions,
  QUESTION_TYPE_LABELS,
  trueFalseOptions,
  type QuestionType,
} from "@/lib/exercises";
import { Pencil } from "lucide-react";

type ClassOption = { id: string; name: string };

function questionsFromExercise(
  questions: Array<{
    prompt: string;
    type: string;
    points: number;
    xpReward: number;
    options: string | null;
  }>
): DraftQuestion[] {
  if (questions.length === 0) return [newQuestion()];
  return questions.map((question) => ({
    prompt: question.prompt,
    type: question.type as QuestionType,
    points: question.points,
    xpReward: question.xpReward,
    options:
      question.type === "true_false"
        ? parseOptions(question.options).length
          ? parseOptions(question.options)
          : trueFalseOptions()
        : question.type === "flashcard"
          ? flashcardBackOption(parseOptions(question.options)[0]?.text ?? "")
          : question.type === "choice"
            ? parseOptions(question.options)
            : [],
  }));
}

export function EditExerciseForm({
  exercise,
  classes = [],
}: {
  exercise: {
    id: string;
    title: string;
    description: string | null;
    kind: string;
    classId: string | null;
    audienceType: string;
    personalizationTag: string | null;
    maxPoints: number;
    xpReward: number;
    coinReward: number;
    dueDate: string;
    isActive: boolean;
    questions: Array<{
      prompt: string;
      type: string;
      points: number;
      xpReward: number;
      options: string | null;
    }>;
    studentTargets: Array<{ studentId: string }>;
  };
  classes?: ClassOption[];
}) {
  const [open, setOpen] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [title, setTitle] = useState(exercise.title);
  const [description, setDescription] = useState(exercise.description ?? "");
  const [kind, setKind] = useState(exercise.kind);
  const [classId, setClassId] = useState(exercise.classId ?? "");
  const [audienceType, setAudienceType] = useState<ExerciseAudienceType>(
    exercise.audienceType === "personalized" ? "personalized" : "class"
  );
  const [personalizationTag, setPersonalizationTag] = useState(exercise.personalizationTag ?? "");
  const [selectedStudentIds, setSelectedStudentIds] = useState(
    exercise.studentTargets.map((target) => target.studentId)
  );
  const [maxPoints, setMaxPoints] = useState(exercise.maxPoints);
  const [xpReward, setXpReward] = useState(exercise.xpReward);
  const [coinReward, setCoinReward] = useState(exercise.coinReward);
  const [dueDate, setDueDate] = useState(exercise.dueDate);
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => questionsFromExercise(exercise.questions));

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      formData.set("id", exercise.id);
      formData.set("isActive", exercise.isActive ? "true" : "false");
      formData.set("title", title.trim());
      formData.set("description", description.trim());
      formData.set("kind", kind);
      formData.set("classId", classId);
      formData.set("audienceType", audienceType);
      formData.set("personalizationTag", personalizationTag);
      formData.set("maxPoints", String(maxPoints));
      formData.set("xpReward", String(xpReward));
      formData.set("coinReward", String(coinReward));
      formData.set("dueDate", dueDate);
      selectedStudentIds.forEach((studentId) => formData.append("studentTargetIds", studentId));
      formData.set("questionsJson", JSON.stringify(questions));
      const result = await updateExerciseAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    null
  );

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question, i) => (i === index ? { ...question, ...patch } : question)));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setClientError("Informe o título.");
      return;
    }
    if (!classId) {
      setClientError("Selecione uma turma.");
      return;
    }
    if (audienceType === "personalized" && selectedStudentIds.length === 0) {
      setClientError("Selecione pelo menos um aluno.");
      return;
    }
    const questionsError = validateDraftQuestions(questions);
    if (questionsError) {
      setClientError(questionsError);
      return;
    }
    setClientError(null);
    formAction(new FormData(event.currentTarget));
  }

  const totalQuestionPoints = useMemo(
    () => questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0),
    [questions]
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Editar exercício
        </Button>
        <ToggleExerciseButton id={exercise.id} isActive={exercise.isActive} />
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={`Editar — ${exercise.title}`} size="lg">
        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="edit-title">Título</Label>
              <Input id="edit-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
            </div>
            <div>
              <Label htmlFor="edit-kind">Tipo</Label>
              <Select id="edit-kind" value={kind} onChange={(event) => setKind(event.target.value)}>
                <option value="homework">Exercício de casa</option>
                <option value="exam">Prova</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-class">Turma</Label>
              <Select id="edit-class" value={classId} onChange={(event) => setClassId(event.target.value)} required>
                <option value="">Selecione...</option>
                {classes.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <ExerciseStudentTargetsField
            classId={classId}
            audienceType={audienceType}
            onAudienceTypeChange={setAudienceType}
            personalizationTag={personalizationTag}
            onPersonalizationTagChange={setPersonalizationTag}
            selectedStudentIds={selectedStudentIds}
            onSelectedStudentIdsChange={setSelectedStudentIds}
          />

          <div>
            <Label htmlFor="edit-desc">Instruções</Label>
            <Textarea id="edit-desc" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="edit-due">Prazo</Label>
              <Input id="edit-due" type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-pts">Pontuação máx.</Label>
              <Input
                id="edit-pts"
                type="number"
                step="0.5"
                value={maxPoints}
                onChange={(event) => setMaxPoints(parseBoundedFloat(event.target.value, maxPoints))}
              />
            </div>
            <div>
              <Label htmlFor="edit-xp">XP</Label>
              <Input
                id="edit-xp"
                type="number"
                value={xpReward}
                onChange={(event) => setXpReward(parseBoundedInt(event.target.value, xpReward))}
              />
            </div>
            <div>
              <Label htmlFor="edit-coins">Moedas</Label>
              <Input
                id="edit-coins"
                type="number"
                value={coinReward}
                onChange={(event) => setCoinReward(parseBoundedInt(event.target.value, coinReward))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-800">Questões ({questions.length})</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setQuestions((current) => [...current, newQuestion()])}
              >
                + Questão
              </Button>
            </div>
            <p className="text-xs text-slate-500">Soma de pontos das questões: {totalQuestionPoints.toFixed(1)}</p>
            {questions.map((question, index) => (
              <div key={index} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700">Q{index + 1}</span>
                  <Select
                    value={question.type}
                    onChange={(event) => {
                      const nextType = event.target.value as QuestionType;
                      updateQuestion(index, {
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
                  >
                    {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => (
                      <option key={type} value={type}>
                        {QUESTION_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    step="0.5"
                    className="h-9 w-20"
                    value={question.points}
                    onChange={(event) => updateQuestion(index, { points: parseBoundedFloat(event.target.value, 0) })}
                    aria-label="Pontos"
                  />
                  <Input
                    type="number"
                    className="h-9 w-20"
                    value={question.xpReward}
                    onChange={(event) => updateQuestion(index, { xpReward: parseBoundedInt(event.target.value, 0) })}
                    aria-label="XP"
                  />
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => setQuestions((current) => current.filter((_, i) => i !== index))}
                    >
                      Remover
                    </Button>
                  )}
                </div>
                <Input
                  value={question.prompt}
                  onChange={(event) => updateQuestion(index, { prompt: event.target.value })}
                  placeholder="Enunciado..."
                />
                {question.type === "choice" &&
                  question.options.map((option, optionIndex) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`edit-correct-${index}`}
                        checked={option.isCorrect}
                        onChange={() =>
                          updateQuestion(index, {
                            options: question.options.map((item, i) => ({ ...item, isCorrect: i === optionIndex })),
                          })
                        }
                      />
                      <Input
                        value={option.text}
                        onChange={(event) =>
                          updateQuestion(index, {
                            options: question.options.map((item, i) =>
                              i === optionIndex ? { ...item, text: event.target.value } : item
                            ),
                          })
                        }
                        placeholder={`Alternativa ${String.fromCharCode(65 + optionIndex)}`}
                      />
                    </div>
                  ))}
              </div>
            ))}
          </div>

          {(clientError || state?.error) && (
            <p className="text-sm text-red-600" role="alert">
              {clientError ?? state?.error}
            </p>
          )}
          {state?.success && <p className="text-sm text-emerald-600">Exercício atualizado!</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
