"use client";

import { useActionState, useState } from "react";
import { createHomeTaskAction } from "@/actions/home-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { HOME_TASK_DEFAULT_COINS, HOME_TASK_DEFAULT_XP } from "@/lib/constants";
import { Home } from "lucide-react";

interface ChildOption {
  id: string;
  name: string;
}

export function CreateHomeTaskForm({ childOptions }: { childOptions: ChildOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const r = await createHomeTaskAction(formData);
      if (r.success) setOpen(false);
      return r;
    },
    null
  );

  if (childOptions.length === 0) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary" className="w-full gap-2 sm:w-auto">
        <Home className="h-4 w-4" aria-hidden="true" />
        Tarefa de casa
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova tarefa de casa">
        <form action={formAction} className="space-y-4">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Ao concluir, seu filho ganha <strong>{HOME_TASK_DEFAULT_XP} XP</strong> e{" "}
            <strong>{HOME_TASK_DEFAULT_COINS} moedas</strong>.
          </p>
          <div>
            <Label htmlFor="ht-studentId">Filho(a)</Label>
            <Select id="ht-studentId" name="studentId" required defaultValue="">
              <option value="">Selecione...</option>
              {childOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ht-title">O que fazer?</Label>
            <Input id="ht-title" name="title" required placeholder="Ex.: Arrumar o quarto" />
          </div>
          <div>
            <Label htmlFor="ht-description">Detalhes (opcional)</Label>
            <Textarea id="ht-description" name="description" rows={2} placeholder="Instruções extras..." />
          </div>
          <div>
            <Label htmlFor="ht-dueDate">Prazo (opcional)</Label>
            <Input id="ht-dueDate" name="dueDate" type="date" />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Criar tarefa"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
