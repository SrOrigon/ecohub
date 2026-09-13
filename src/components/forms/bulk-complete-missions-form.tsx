"use client";

import { useActionState } from "react";
import { bulkCompleteMissionsAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, CheckCheck, CheckCircle2, User } from "lucide-react";

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
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <span>{state.completed} missão(ões) confirmada(s) com sucesso!</span>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3.5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <CheckSquare className="h-4 w-4" aria-hidden="true" />
        </div>
        <span>{items.length} pedido(s) de confirmação aguardando aprovação</span>
      </div>

      <ul className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200/90 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/40">
        {items.map((item) => {
          const key = `${item.studentId}:${item.missionId}`;
          return (
            <li
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 bg-white p-3 shadow-2xs transition-colors hover:border-indigo-300 hover:bg-indigo-50/20 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
            >
              <label className="flex flex-1 cursor-pointer items-center gap-3 select-none">
                <input
                  type="checkbox"
                  name="items"
                  value={key}
                  defaultChecked
                  className="h-4 w-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                />
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 truncate">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{item.studentName}</span>
                    {item.className && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">· {item.className}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{item.missionTitle}</p>
                </div>
              </label>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="default" className="text-xs">+{item.xpReward} XP</Badge>
                {item.coinReward > 0 && (
                  <Badge variant="warning" className="text-xs">+{item.coinReward} 🪙</Badge>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="gap-2">
        <CheckCheck className="h-4 w-4" />
        {pending ? "Confirmando..." : `Confirmar selecionadas (${items.length})`}
      </Button>
    </form>
  );
}
