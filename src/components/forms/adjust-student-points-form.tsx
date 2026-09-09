"use client";

import { useActionState } from "react";
import { adjustStudentPointsAction } from "@/actions/point-adjustments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";

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
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">
          Registre ganhos ou perdas de XP e moedas por atividades em sala. O histórico fica no perfil do aluno.
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
          placeholder="Ex.: Apresentação oral, participação no grupo, uso do celular..."
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

      <div className="flex flex-wrap gap-2">
        {CLASS_ACTIVITY_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
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
            {preset.label}
          </button>
        ))}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Aplicar ajuste"}
      </Button>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && state.message && (
        <p className="text-sm text-emerald-700" role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
