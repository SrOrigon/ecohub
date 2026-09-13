"use client";

import { useActionState, useState, type ReactNode } from "react";
import { createMissionAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";

interface ClassOption {
  id: string;
  name: string;
}

import { Plus, Target } from "lucide-react";

export function CreateMissionForm({
  classes,
  defaultXp = 100,
  defaultCoins = 30,
  trigger,
  hideDefaultTrigger = false,
}: {
  classes: ClassOption[];
  defaultXp?: number;
  defaultCoins?: number;
  trigger?: ReactNode;
  hideDefaultTrigger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await createMissionAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    null
  );

  return (
    <>
      {trigger ? (
        <button type="button" className="inline-flex w-full border-0 bg-transparent p-0 text-left" onClick={() => setOpen(true)}>
          {trigger}
        </button>
      ) : hideDefaultTrigger ? null : (
        <Button onClick={() => setOpen(true)} className="gap-1.5 shadow-xs">
          <Plus className="h-4 w-4" />
          Nova missão
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Criar nova missão">
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="title">Título da missão</Label>
            <Input id="title" name="title" required placeholder="Ex.: Leitura do Capítulo 3" />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" placeholder="Instruções claras para o aluno concluir a missão..." />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="xpReward">Recompensa de XP</Label>
              <Input id="xpReward" name="xpReward" type="number" defaultValue={defaultXp} />
            </div>
            <div>
              <Label htmlFor="coinReward">Recompensa de moedas</Label>
              <Input id="coinReward" name="coinReward" type="number" defaultValue={defaultCoins} />
            </div>
          </div>
          <div>
            <Label htmlFor="classId">Turma (opcional)</Label>
            <Select id="classId" name="classId">
              <option value="">Toda a escola</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="dueDate">Prazo de entrega</Label>
            <Input id="dueDate" name="dueDate" type="date" />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full gap-2">
            <Target className="h-4 w-4" />
            {pending ? "Criando..." : "Criar missão"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
