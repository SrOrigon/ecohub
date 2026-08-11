"use client";

import { useActionState } from "react";
import { saveScheduleSlotAction } from "@/actions/product-suite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function ScheduleSlotForm({
  classes,
  subjects,
}: {
  classes: { id: string; name: string }[];
  subjects: string[];
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      return (await saveScheduleSlotAction(formData)) ?? null;
    },
    null
  );

  if (subjects.length === 0) return null;

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <Label htmlFor="classId">Turma / curso</Label>
        <Select id="classId" name="classId" required>
          <option value="">Selecione...</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="weekday">Dia</Label>
        <Select id="weekday" name="weekday" defaultValue="1">
          {WEEKDAYS.map((d, i) => (
            <option key={i} value={i}>
              {d}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="subject">Disciplina</Label>
        <Select id="subject" name="subject" required>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="startTime">Início</Label>
        <Input id="startTime" name="startTime" type="time" required defaultValue="07:30" />
      </div>
      <div>
        <Label htmlFor="endTime">Fim</Label>
        <Input id="endTime" name="endTime" type="time" required defaultValue="08:20" />
      </div>
      <div>
        <Label htmlFor="room">Sala</Label>
        <Input id="room" name="room" placeholder="Ex.: 12" />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <FormMessage message={state} />
        <Button type="submit" disabled={pending} className="mt-2">
          {pending ? "Salvando..." : "Adicionar horário"}
        </Button>
      </div>
    </form>
  );
}
