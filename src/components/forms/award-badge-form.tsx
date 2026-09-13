"use client";

import { useActionState } from "react";
import { awardBadgeAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form-fields";
import { CheckCircle2, Sparkles } from "lucide-react";

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
      const result = await awardBadgeAction(formData);
      return {
        error: "error" in result ? result.error : undefined,
        success: "success" in result ? result.success : undefined,
      };
    },
    null
  );

  if (students.length === 0) {
    return <p className="text-xs text-slate-400 italic">Nenhum aluno para aplicar nesta turma.</p>;
  }

  if (pendingStudents.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>Todos os alunos já conquistaram</span>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="badgeId" value={badgeId} />
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <Label htmlFor={`award-student-${badgeId}`} className="sr-only">
            Selecionar aluno
          </Label>
          <Select
            id={`award-student-${badgeId}`}
            name="studentId"
            required
            defaultValue=""
            className="h-8 py-1 px-2 text-xs rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60"
          >
            <option value="" disabled>
              Aplicar ao aluno...
            </option>
            {pendingStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          className="shrink-0 h-8 px-2.5 text-xs gap-1"
        >
          <Sparkles className="h-3 w-3" />
          {pending ? "..." : "Aplicar"}
        </Button>
      </div>
      {state?.error && (
        <p className="text-xs text-red-600 mt-0.5" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1" role="status">
          <CheckCircle2 className="h-3 w-3" /> Conquista aplicada!
        </p>
      )}
    </form>
  );
}
