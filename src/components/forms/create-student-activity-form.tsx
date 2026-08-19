"use client";

import { useActionState } from "react";
import { createStudentActivityAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { STUDENT_ACTIVITY_TYPES } from "@/lib/student-profile";

export function CreateStudentActivityForm({ studentId }: { studentId: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) =>
      createStudentActivityAction(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
      <input type="hidden" name="studentId" value={studentId} />
      <p className="text-sm font-medium text-slate-800">Registrar atividade ou evento</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="activity-type">Tipo</Label>
          <Select id="activity-type" name="type" defaultValue="custom">
            {STUDENT_ACTIVITY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="activity-date">Data</Label>
          <Input id="activity-date" name="occurredAt" type="date" />
        </div>
      </div>
      <div>
        <Label htmlFor="activity-title">Título</Label>
        <Input id="activity-title" name="title" required placeholder="Ex.: Feira de ciências" />
      </div>
      <div>
        <Label htmlFor="activity-detail">Detalhe (opcional)</Label>
        <Textarea id="activity-detail" name="detail" rows={2} placeholder="Presença, check-in ou interação" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">Atividade registrada.</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Salvando..." : "Adicionar ao histórico"}
      </Button>
    </form>
  );
}
