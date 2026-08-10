"use client";

import { useActionState, useState } from "react";
import { updateGradeAction, deleteGradeAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";

export function GradeRowActions({
  gradeId,
  value,
  maxGrade,
  passGrade,
}: {
  gradeId: string;
  value: number;
  maxGrade: number;
  passGrade: number;
}) {
  const [editing, setEditing] = useState(false);

  const [editState, editAction, editPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateGradeAction(formData);
      if (result.success) setEditing(false);
      return result;
    },
    null
  );

  const [deleteState, deleteAction, deletePending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) =>
      (await deleteGradeAction(formData)) ?? null,
    null
  );

  function gradeVariant(v: number) {
    if (v >= passGrade) return "success" as const;
    if (v >= passGrade - 2) return "warning" as const;
    return "danger" as const;
  }

  if (deleteState?.success) {
    return <span className="text-xs text-slate-400">Removida</span>;
  }

  if (editing) {
    return (
      <form action={editAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="gradeId" value={gradeId} />
        <Input
          name="value"
          type="number"
          step="0.1"
          min={0}
          max={maxGrade}
          defaultValue={value}
          className="h-8 w-20"
          required
        />
        <Button type="submit" size="sm" disabled={editPending}>
          {editPending ? "..." : "Salvar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
        {editState?.error && <span className="text-xs text-red-600">{editState.error}</span>}
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={gradeVariant(value)}>
        {value.toFixed(1)} / {maxGrade}
      </Badge>
      <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditing(true)}>
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">Editar</span>
      </Button>
      <form action={deleteAction}>
        <input type="hidden" name="gradeId" value={gradeId} />
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-red-600 hover:text-red-700"
          disabled={deletePending}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Excluir</span>
        </Button>
      </form>
      {deleteState?.error && <span className="text-xs text-red-600">{deleteState.error}</span>}
    </div>
  );
}
