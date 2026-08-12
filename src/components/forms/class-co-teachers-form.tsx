"use client";

import { useActionState } from "react";
import { updateClassCoTeachersAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

type TeacherOption = { id: string; fullName: string };

export function ClassCoTeachersForm({
  classId,
  className,
  primaryTeacherId,
  currentCoTeacherIds,
  teachers,
}: {
  classId: string;
  className: string;
  primaryTeacherId: string | null;
  currentCoTeacherIds: string[];
  teachers: TeacherOption[];
}) {
  const options = teachers.filter((t) => t.id !== primaryTeacherId);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) =>
      (await updateClassCoTeachersAction(formData)) ?? null,
    null
  );

  if (options.length === 0) return null;

  return (
    <form action={formAction} className="mt-4 rounded-lg border border-dashed border-slate-200 p-3 dark:border-slate-700">
      <input type="hidden" name="classId" value={classId} />
      <p className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-600">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        Co-docentes — {className}
      </p>
      <div className="flex flex-wrap gap-3">
        {options.map((t) => (
          <label key={t.id} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              name="coTeacherIds"
              value={t.id}
              defaultChecked={currentCoTeacherIds.includes(t.id)}
            />
            {t.fullName}
          </label>
        ))}
      </div>
      {state?.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="mt-2 text-xs text-emerald-600">Co-docentes atualizados.</p>}
      <Button type="submit" size="sm" variant="outline" className="mt-2" disabled={pending}>
        {pending ? "Salvando..." : "Salvar co-docentes"}
      </Button>
    </form>
  );
}
