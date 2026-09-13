"use client";

import { useActionState } from "react";
import { completeMissionAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form-fields";

export function StaffCompleteMissionForm({
  missionId,
  students,
}: {
  missionId: string;
  students: { id: string; name: string; completed: boolean }[];
}) {
  const pendingStudents = students.filter((s) => !s.completed);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      return await completeMissionAction(formData);
    },
    null
  );

  if (pendingStudents.length === 0) {
    return <p className="text-sm text-emerald-700">Todos os alunos elegíveis já concluíram esta missão.</p>;
  }

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="missionId" value={missionId} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Label htmlFor={`student-${missionId}`} className="sr-only">
            Selecionar aluno
          </Label>
          <Select id={`student-${missionId}`} name="studentId" required defaultValue="" className="h-9 text-xs">
            <option value="" disabled>
              Selecionar aluno para concluir...
            </option>
            {pendingStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" size="sm" disabled={pending} className="shrink-0 gap-1.5 h-9 text-xs">
          {pending ? "Salvando..." : "Concluir"}
        </Button>
      </div>
      {state?.error && (
        <p className="text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400" role="status">
          ✓ Missão concluída com sucesso!
        </p>
      )}
    </form>
  );
}
