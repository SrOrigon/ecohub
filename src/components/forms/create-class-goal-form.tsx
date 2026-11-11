"use client";

import { useActionState, useState } from "react";
import { createClassGoalAction, checkClassGoalsAction } from "@/actions/class-goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";
import { Modal } from "@/components/ui/modal";
import { CLASS_GOAL_METRICS, CLASS_GOAL_LABELS } from "@/lib/constants";
import { Target } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
}

export function CreateClassGoalForm({
  classes,
  defaults,
}: {
  classes: ClassOption[];
  defaults: { targetPercent: number; xpBonus: number; coinBonus: number };
}) {
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const r = await createClassGoalAction(formData);
      if (r.success) setOpen(false);
      return r;
    },
    null
  );

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Target className="h-4 w-4" aria-hidden="true" />
        Nova meta coletiva
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Meta coletiva da turma">
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="goal-classId">Turma</Label>
            <Select id="goal-classId" name="classId" required>
              <option value="">Selecione...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="goal-title">Título</Label>
            <Input id="goal-title" name="title" required />
          </div>
          <div>
            <Label htmlFor="goal-metric">Métrica</Label>
            <Select id="goal-metric" name="metric" defaultValue="mission">
              {CLASS_GOAL_METRICS.map((m) => (
                <option key={m} value={m}>{CLASS_GOAL_LABELS[m]}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="goal-targetPercent">Meta (%)</Label>
              <Input id="goal-targetPercent" name="targetPercent" type="number" defaultValue={defaults.targetPercent} />
            </div>
            <div>
              <Label htmlFor="goal-xpBonus">Bônus XP</Label>
              <Input id="goal-xpBonus" name="xpBonus" type="number" defaultValue={defaults.xpBonus} />
            </div>
            <div>
              <Label htmlFor="goal-coinBonus">Bônus moedas</Label>
              <Input id="goal-coinBonus" name="coinBonus" type="number" defaultValue={defaults.coinBonus} />
            </div>
          </div>
          <div>
            <Label htmlFor="goal-deadline">Prazo (opcional)</Label>
            <Input id="goal-deadline" name="deadline" type="date" />
          </div>
          <FormMessage message={state} />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Criando..." : "Criar meta"}
          </Button>
        </form>
      </Modal>
    </>
  );
}

export function CheckClassGoalButton({ classId }: { classId: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) =>
      checkClassGoalsAction(formData),
    null
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="classId" value={classId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Verificando..." : "Verificar meta"}
      </Button>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="mt-1 text-xs text-emerald-600">Verificado!</p>}
    </form>
  );
}
