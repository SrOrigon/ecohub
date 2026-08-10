"use client";

import { useActionState } from "react";
import { bulkCompleteMissionsAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare } from "lucide-react";

type PendingItem = {
  studentId: string;
  missionId: string;
  studentName: string;
  className: string | null;
  missionTitle: string;
  xpReward: number;
  coinReward: number;
};

export function BulkCompleteMissionsForm({ items }: { items: PendingItem[] }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; completed?: number } | null, formData: FormData) =>
      (await bulkCompleteMissionsAction(formData)) ?? null,
    null
  );

  if (items.length === 0) return null;

  if (state?.success) {
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
        {state.completed} missão(ões) confirmada(s) com sucesso.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <CheckSquare className="h-4 w-4 text-indigo-600" aria-hidden="true" />
        {items.length} pedido(s) de confirmação aguardando
      </p>
      <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        {items.map((item) => {
          const key = `${item.studentId}:${item.missionId}`;
          return (
            <li key={key} className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex flex-1 cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  name="items"
                  value={key}
                  defaultChecked
                  className="mt-1"
                />
                <span>
                  <strong>{item.studentName}</strong>
                  {item.className && <span className="text-slate-500"> · {item.className}</span>}
                  <br />
                  <span className="text-slate-600">{item.missionTitle}</span>
                </span>
              </label>
              <Badge>+{item.xpReward} XP</Badge>
            </li>
          );
        })}
      </ul>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Confirmando..." : `Confirmar selecionadas (${items.length})`}
      </Button>
    </form>
  );
}
