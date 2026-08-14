"use client";

import { useActionState, useState } from "react";
import { justifyAbsenceAction } from "@/actions/parents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/form-fields";
import { formatDate } from "@/lib/utils";
import { FileCheck } from "lucide-react";

interface AbsenceRecord {
  id: string;
  date: Date;
  status: string;
  justificationNote?: string | null;
}

export function JustifyAbsencePanel({
  studentId,
  absences,
}: {
  studentId: string;
  absences: AbsenceRecord[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    absences.find((a) => a.status === "absent" || a.status === "late")?.id ?? null
  );

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) =>
      (await justifyAbsenceAction(formData)) ?? null,
    null
  );

  const pendingAbsences = absences.filter((a) => a.status === "absent" || a.status === "late");

  if (pendingAbsences.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
        <FileCheck className="h-4 w-4" aria-hidden="true" />
        Justificar falta ou atraso
      </p>

      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          Justificativa enviada. A escola e o professor foram notificados.
        </p>
      ) : (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="attendanceId" value={selectedId ?? ""} />

          <div>
            <Label htmlFor="absencePick">Dia</Label>
            <select
              id="absencePick"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              required
            >
              {pendingAbsences.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatDate(a.date)}  -  {a.status === "late" ? "Atraso" : "Falta"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="note">Motivo</Label>
            <textarea
              id="note"
              name="note"
              rows={3}
              required
              minLength={10}
              maxLength={500}
              placeholder="Ex.: Consulta médica com atestado entregue na secretaria."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600 dark:text-red-300">{state.error}</p>
          )}

          <Button type="submit" size="sm" disabled={pending || !selectedId}>
            {pending ? "Enviando..." : "Enviar justificativa"}
          </Button>
        </form>
      )}
    </div>
  );
}
