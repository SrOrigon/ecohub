"use client";

import { useActionState } from "react";
import { awardBadgeAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form-fields";

export function AwardBadgeForm({
  badgeId,
  students,
}: {
  badgeId: string;
  students: { id: string; name: string; earned: boolean }[];
}) {
  const pendingStudents = students.filter((s) => !s.earned);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      return await awardBadgeAction(formData);
    },
    null
  );

  if (students.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum aluno nesta turma para aplicar a atitude.</p>;
  }

  if (pendingStudents.length === 0) {
    return <p className="text-sm text-emerald-700">Todos os alunos da turma já receberam esta atitude.</p>;
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="badgeId" value={badgeId} />
      <div className="min-w-0 flex-1">
        <Label htmlFor={`award-student-${badgeId}`} className="sr-only">
          Selecionar aluno
        </Label>
        <Select id={`award-student-${badgeId}`} name="studentId" required defaultValue="">
          <option value="" disabled>
            Aplicar a um aluno...
          </option>
          {pendingStudents.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={pending} className="shrink-0">
        {pending ? "Aplicando..." : "Aplicar"}
      </Button>
      {state?.error && (
        <p className="w-full text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="w-full text-sm text-emerald-700" role="status">
          Atitude aplicada.
        </p>
      )}
    </form>
  );
}
