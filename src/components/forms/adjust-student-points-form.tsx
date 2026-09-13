"use client";

import { useActionState } from "react";
import { adjustStudentPointsAction } from "@/actions/point-adjustments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { Sparkles, TrendingUp, TrendingDown, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const CLASS_ACTIVITY_PRESETS: Array<{
  label: string;
  xp: number;
  coins: number;
  loss?: boolean;
}> = [
  { label: "Participação ativa", xp: 10, coins: 5 },
  { label: "Ajuda aos colegas", xp: 15, coins: 0 },
  { label: "Entrega exemplar", xp: 20, coins: 10 },
  { label: "Comportamento inadequado", xp: 10, coins: 5, loss: true },
  { label: "Material esquecido", xp: 0, coins: 3, loss: true },
  { label: "Atraso na atividade", xp: 5, coins: 0, loss: true },
];

type StudentOption = { id: string; name: string; className?: string | null };

export function AdjustStudentPointsForm({
  students,
  fixedStudentId,
  title = "Pontos em atividade de sala",
}: {
  students: StudentOption[];
  fixedStudentId?: string;
  title?: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; message?: string } | null, formData: FormData) =>
      adjustStudentPointsAction(formData),
    null
  );

  const pool = fixedStudentId ? students.filter((s) => s.id === fixedStudentId) : students;
  if (pool.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum aluno disponível para ajuste de pontos.</p>;
  }

  return (
    <form id="adjust-points-form" action={formAction} className="space-y-4">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Registre ganhos ou perdas de XP e moedas por atividades em sala. O histórico fica registrado no perfil do aluno.
        </p>
      </div>

      {!fixedStudentId && (
        <div>
          <Label htmlFor="adjust-student">Aluno</Label>
          <Select id="adjust-student" name="studentId" required defaultValue="">
            <option value="" disabled>
              Selecione o aluno...
            </option>
            {pool.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.className ? ` · ${s.className}` : ""}
              </option>
            ))}
          </Select>
        </div>
      )}
      {fixedStudentId && <input type="hidden" name="studentId" value={fixedStudentId} />}

      <div>
        <Label htmlFor="adjust-activity">Atividade / motivo</Label>
        <Textarea
          id="adjust-activity"
          name="activity"
          required
          rows={2}
          placeholder="Ex.: Apresentação oral, participação no grupo, uso indevido do celular..."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="adjust-direction">Tipo</Label>
          <Select id="adjust-direction" name="direction" defaultValue="gain">
            <option value="gain">Ganho (+)</option>
            <option value="loss">Perda (−)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="adjust-xp">XP</Label>
          <Input id="adjust-xp" name="xpAmount" inputMode="numeric" autoComplete="off" defaultValue={10} />
        </div>
        <div>
          <Label htmlFor="adjust-coins">Moedas</Label>
          <Input id="adjust-coins" name="coinAmount" inputMode="numeric" autoComplete="off" defaultValue={0} />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Atalhos rápidos de atividade:</p>
        <div className="flex flex-wrap gap-1.5">
          {CLASS_ACTIVITY_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-2xs transition-all duration-150 active:scale-95",
                preset.loss
                  ? "border-rose-200/80 bg-rose-50/50 text-rose-700 hover:border-rose-300 hover:bg-rose-100/60 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                  : "border-slate-200/90 bg-white/80 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700"
              )}
              onClick={() => {
                const form = document.getElementById("adjust-points-form") as HTMLFormElement | null;
                if (!form) return;
                const activity = form.elements.namedItem("activity") as HTMLTextAreaElement | null;
                const direction = form.elements.namedItem("direction") as HTMLSelectElement | null;
                const xp = form.elements.namedItem("xpAmount") as HTMLInputElement | null;
                const coins = form.elements.namedItem("coinAmount") as HTMLInputElement | null;
                if (activity) activity.value = preset.label;
                if (direction) direction.value = preset.loss ? "loss" : "gain";
                if (xp) xp.value = String(preset.xp);
                if (coins) coins.value = String(preset.coins);
              }}
            >
              {preset.loss ? (
                <TrendingDown className="h-3 w-3 text-rose-500" />
              ) : (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              )}
              <span>{preset.label}</span>
              <span className="opacity-60 text-[10px]">
                ({preset.loss ? "-" : "+"}{preset.xp} XP)
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-1">
        <Button type="submit" disabled={pending} className="gap-1.5">
          <Sparkles className="h-4 w-4" />
          {pending ? "Salvando..." : "Aplicar ajuste"}
        </Button>
      </div>

      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}
      {state?.success && state.message && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{state.message}</span>
        </div>
      )}
    </form>
  );
}
