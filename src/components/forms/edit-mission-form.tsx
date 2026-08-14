"use client";

import { useActionState, useState } from "react";
import { updateMissionAction, toggleMissionAction, deleteMissionAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";

interface ClassOption {
  id: string;
  name: string;
}

interface MissionData {
  id: string;
  title: string;
  description: string | null;
  xpReward: number;
  coinReward: number;
  classId: string | null;
  dueDate: Date | string | null;
  isActive: boolean;
}

export function EditMissionForm({
  mission,
  classes,
}: {
  mission: MissionData;
  classes: ClassOption[];
}) {
  const [open, setOpen] = useState(false);
  const dueValue = mission.dueDate
    ? new Date(mission.dueDate).toISOString().split("T")[0]
    : "";

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateMissionAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    null
  );

  const [toggleState, toggleAction, togglePending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      return await toggleMissionAction(formData);
    },
    null
  );

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Editar
      </Button>
      <form action={toggleAction}>
        <input type="hidden" name="missionId" value={mission.id} />
        <Button type="submit" size="sm" variant={mission.isActive ? "ghost" : "secondary"} disabled={togglePending}>
          {mission.isActive ? "Desativar" : "Ativar"}
        </Button>
      </form>
      <DeleteConfirmButton
        label="Excluir"
        confirmMessage={`Excluir a missão "${mission.title}"? Progresso dos alunos será perdido. Esta ação não pode ser desfeita.`}
        hiddenFields={{ missionId: mission.id }}
        action={deleteMissionAction}
      />
      {toggleState?.error && <p className="w-full text-xs text-red-600">{toggleState.error}</p>}

      <Modal open={open} onClose={() => setOpen(false)} title="Editar missão">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="missionId" value={mission.id} />
          <div>
            <Label htmlFor={`title-${mission.id}`}>Título</Label>
            <Input id={`title-${mission.id}`} name="title" defaultValue={mission.title} required />
          </div>
          <div>
            <Label htmlFor={`desc-${mission.id}`}>Descrição</Label>
            <Textarea id={`desc-${mission.id}`} name="description" defaultValue={mission.description ?? ""} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`xp-${mission.id}`}>XP</Label>
              <Input id={`xp-${mission.id}`} name="xpReward" type="number" defaultValue={mission.xpReward} />
            </div>
            <div>
              <Label htmlFor={`coin-${mission.id}`}>Moedas</Label>
              <Input id={`coin-${mission.id}`} name="coinReward" type="number" defaultValue={mission.coinReward} />
            </div>
          </div>
          <div>
            <Label htmlFor={`class-${mission.id}`}>Turma</Label>
            <Select id={`class-${mission.id}`} name="classId" defaultValue={mission.classId ?? ""}>
              <option value="">Toda a escola</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`due-${mission.id}`}>Prazo</Label>
            <Input id={`due-${mission.id}`} name="dueDate" type="date" defaultValue={dueValue} />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
