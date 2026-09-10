"use client";

import { useActionState, useState } from "react";
import { updateScheduleSlotAction } from "@/actions/product-suite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";
import { Modal } from "@/components/ui/modal";
import { Pencil } from "lucide-react";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export type EditableScheduleSlot = {
  id: string;
  classId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  subject: string;
  room: string | null;
};

export function EditScheduleSlotForm({
  slot,
  classes,
  subjects,
}: {
  slot: EditableScheduleSlot;
  classes: { id: string; name: string }[];
  subjects: string[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateScheduleSlotAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    null
  );

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Editar
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar horário">
        <form action={formAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={slot.id} />
          <div>
            <Label htmlFor={`edit-class-${slot.id}`}>Turma / curso</Label>
            <Select id={`edit-class-${slot.id}`} name="classId" required defaultValue={slot.classId}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`edit-weekday-${slot.id}`}>Dia</Label>
            <Select id={`edit-weekday-${slot.id}`} name="weekday" defaultValue={String(slot.weekday)}>
              {WEEKDAYS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`edit-subject-${slot.id}`}>Disciplina</Label>
            <Select id={`edit-subject-${slot.id}`} name="subject" required defaultValue={slot.subject}>
              {subjects.includes(slot.subject) ? null : (
                <option value={slot.subject}>{slot.subject}</option>
              )}
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`edit-start-${slot.id}`}>Início</Label>
            <Input
              id={`edit-start-${slot.id}`}
              name="startTime"
              type="time"
              required
              defaultValue={slot.startTime}
            />
          </div>
          <div>
            <Label htmlFor={`edit-end-${slot.id}`}>Fim</Label>
            <Input
              id={`edit-end-${slot.id}`}
              name="endTime"
              type="time"
              required
              defaultValue={slot.endTime}
            />
          </div>
          <div>
            <Label htmlFor={`edit-room-${slot.id}`}>Sala</Label>
            <Input id={`edit-room-${slot.id}`} name="room" defaultValue={slot.room ?? ""} placeholder="Ex.: 12" />
          </div>
          <div className="sm:col-span-2">
            <FormMessage message={state} />
            <Button type="submit" disabled={pending} className="mt-2 w-full">
              {pending ? "Salvando..." : "Salvar horário"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
