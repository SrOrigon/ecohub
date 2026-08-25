"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createTrailAction } from "@/actions/trails";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";
import { Modal } from "@/components/ui/modal";
import { TRAIL_STEP_TYPES } from "@/lib/constants";
import { Route, Sparkles } from "lucide-react";

type StepDraft = {
  stepType: string;
  missionId?: string;
  exerciseId?: string;
  rewardId?: string;
  title?: string;
};

interface Options {
  missions: { id: string; title: string }[];
  exercises: { id: string; title: string }[];
  rewards: { id: string; name: string }[];
  classes: { id: string; name: string }[];
}

export function CreateTrailForm({
  options,
  trigger,
  hideDefaultTrigger = false,
  aiSuggestTitle,
}: {
  options: Options;
  trigger?: ReactNode;
  hideDefaultTrigger?: boolean;
  aiSuggestTitle?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<StepDraft[]>([{ stepType: "mission", title: "Etapa 1" }]);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      formData.set("stepsJson", JSON.stringify(steps));
      const r = await createTrailAction(formData);
      if (r.success) {
        setOpen(false);
        setSteps([{ stepType: "mission", title: "Etapa 1" }]);
        router.refresh();
      }
      return r;
    },
    null
  );

  function updateStep(i: number, patch: Partial<StepDraft>) {
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
  }

  return (
    <>
      {trigger ? (
        <button type="button" className="inline-flex border-0 bg-transparent p-0" onClick={() => setOpen(true)}>
          {trigger}
        </button>
      ) : hideDefaultTrigger ? null : (
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Route className="h-4 w-4" aria-hidden="true" />
          Nova trilha
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Criar trilha de aprendizagem">
        <form action={formAction} className="space-y-4">
          {aiSuggestTitle && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-3 text-sm text-violet-900">
              <p className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Sugestão da IA
              </p>
              <p className="mt-1">{aiSuggestTitle}</p>
            </div>
          )}
          <div>
            <Label htmlFor="trail-title">Título</Label>
            <Input id="trail-title" name="title" required placeholder="Ex.: Módulo Frações" />
          </div>
          <div>
            <Label htmlFor="trail-classId">Turma</Label>
            <Select id="trail-classId" name="classId" defaultValue="">
              <option value="">Toda a escola</option>
              {options.classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="trail-description">Descrição</Label>
            <Textarea id="trail-description" name="description" rows={2} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="trail-xpBonus">Bônus XP ao concluir</Label>
              <Input id="trail-xpBonus" name="xpBonus" type="number" defaultValue={100} />
            </div>
            <div>
              <Label htmlFor="trail-coinBonus">Bônus moedas</Label>
              <Input id="trail-coinBonus" name="coinBonus" type="number" defaultValue={30} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-800">Etapas ({steps.length})</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSteps((s) => [...s, { stepType: "mission", title: `Etapa ${s.length + 1}` }])
                }
              >
                + Etapa
              </Button>
            </div>
            {steps.map((st, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={st.stepType}
                    onChange={(e) => updateStep(i, { stepType: e.target.value, missionId: "", exerciseId: "", rewardId: "" })}
                    className="w-full min-w-0 sm:min-w-[9rem] sm:w-auto"
                  >
                    {TRAIL_STEP_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t === "mission" ? "Missão" : t === "exercise" ? "Exercício" : "Recompensa"}
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={st.title ?? ""}
                    onChange={(e) => updateStep(i, { title: e.target.value })}
                    placeholder="Nome da etapa"
                    className="flex-1"
                  />
                </div>
                {st.stepType === "mission" && (
                  <Select
                    value={st.missionId ?? ""}
                    onChange={(e) => updateStep(i, { missionId: e.target.value })}
                  >
                    <option value="">Selecione missão...</option>
                    {options.missions.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </Select>
                )}
                {st.stepType === "exercise" && (
                  <Select
                    value={st.exerciseId ?? ""}
                    onChange={(e) => updateStep(i, { exerciseId: e.target.value })}
                  >
                    <option value="">Selecione exercício...</option>
                    {options.exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.title}</option>
                    ))}
                  </Select>
                )}
                {st.stepType === "reward" && (
                  <Select
                    value={st.rewardId ?? ""}
                    onChange={(e) => updateStep(i, { rewardId: e.target.value })}
                  >
                    <option value="">Selecione recompensa...</option>
                    {options.rewards.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </Select>
                )}
              </div>
            ))}
          </div>

          <FormMessage message={state} />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Criando..." : "Criar trilha"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
