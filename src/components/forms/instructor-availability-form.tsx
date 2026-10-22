"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, Label } from "@/components/ui/form-fields";
import { Input } from "@/components/ui/input";
import { createAvailabilityAction } from "@/actions/appointments";

const DAYS = [
  { label: "Domingo", value: "0" },
  { label: "Segunda-feira", value: "1" },
  { label: "Terça-feira", value: "2" },
  { label: "Quarta-feira", value: "3" },
  { label: "Quinta-feira", value: "4" },
  { label: "Sexta-feira", value: "5" },
  { label: "Sábado", value: "6" },
];

export function InstructorAvailabilityForm({ instructors }: { instructors: any[] }) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await createAvailabilityAction(formData);
    setLoading(false);

    if (res.error) {
      alert(res.error);
    } else {
      alert("Disponibilidade criada com sucesso!");
      (e.target as HTMLFormElement).reset();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Instrutor</Label>
        <Select name="instructorProfileId" required>
          {instructors.map((i: any) => (
            <option key={i.id} value={i.id}>{i.user.fullName}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Dia da Semana</Label>
        <Select name="dayOfWeek" required>
          {DAYS.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Início (ex: 08:00)</Label>
          <Input name="startTime" required placeholder="08:00" />
        </div>
        <div>
          <Label>Fim (ex: 12:00)</Label>
          <Input name="endTime" required placeholder="12:00" />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Salvando..." : "Salvar Disponibilidade"}
      </Button>
    </form>
  );
}
