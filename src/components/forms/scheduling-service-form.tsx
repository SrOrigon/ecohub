"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, Label } from "@/components/ui/form-fields";
import { Input } from "@/components/ui/input";
import { createSchedulingServiceAction } from "@/actions/appointments";

export function SchedulingServiceForm({ instructors }: { instructors: any[] }) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    // Collect all selected instructors
    const selectedInstructors = Array.from(
      (e.currentTarget.elements.namedItem("instructorIds") as HTMLSelectElement).selectedOptions
    ).map(option => option.value);

    formData.set("instructorIds", JSON.stringify(selectedInstructors));

    const res = await createSchedulingServiceAction(formData);
    setLoading(false);

    if (res.error) {
      alert(res.error);
    } else {
      alert("Serviço criado com sucesso!");
      (e.target as HTMLFormElement).reset();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Nome do Serviço</Label>
        <Input name="name" required placeholder="Ex: Aula de Robótica" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Duração (min)</Label>
          <Input name="durationMinutes" type="number" required defaultValue="60" />
        </div>
        <div>
          <Label>Vagas por horário</Label>
          <Input name="maxStudentsPerSlot" type="number" required defaultValue="1" />
        </div>
      </div>
      <div>
        <Label>É online?</Label>
        <Select name="isOnline">
          <option value="false">Não (Presencial)</option>
          <option value="true">Sim (Online)</option>
        </Select>
      </div>
      <div>
        <Label>Instrutores Habilitados</Label>
        <Select name="instructorIds" multiple required className="min-h-[100px]">
          {instructors.map((i: any) => (
            <option key={i.id} value={i.id}>{i.user.fullName}</option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground mt-1">Segure Ctrl (ou Cmd) para selecionar múltiplos.</p>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Salvando..." : "Salvar Serviço"}
      </Button>
    </form>
  );
}
