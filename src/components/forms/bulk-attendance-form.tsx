"use client";

import { useActionState, useState } from "react";
import { bulkAttendanceAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { useToday } from "@/hooks/use-today";
import { ATTENDANCE_STATUSES } from "@/lib/constants";

interface ClassWithStudents {
  id: string;
  name: string;
  students: { id: string; name: string }[];
}

const statusLabels: Record<string, string> = {
  present: "Presente",
  absent: "Falta",
  late: "Atraso",
  justified: "Justificada",
};

export function BulkAttendanceForm({ classes }: { classes: ClassWithStudents[] }) {
  const [open, setOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; message?: string } | null, formData: FormData) => {
      const result = await bulkAttendanceAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    null
  );

  const today = useToday();
  const classData = classes.find((c) => c.id === selectedClass);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        Chamada por turma
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Chamada em lote">
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="bulk-date">Data</Label>
            <Input id="bulk-date" name="date" type="date" defaultValue={today} min="2024-05-01" max={today} required />
          </div>
          <div>
            <Label htmlFor="bulk-classId">Turma</Label>
            <Select
              id="bulk-classId"
              name="classId"
              required
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Selecione a turma...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.students.length} alunos)</option>
              ))}
            </Select>
          </div>

          {classData && (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-3">
              {classData.students.map((s) => (
                <div key={s.id} className="flex flex-col gap-2 rounded-lg border border-slate-100 p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 truncate font-medium">{s.name}</span>
                  <Select name={`status_${s.id}`} defaultValue="present" className="min-h-11 w-full shrink-0 text-base sm:w-36">
                    {ATTENDANCE_STATUSES.map((st) => (
                      <option key={st} value={st}>{statusLabels[st]}</option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          )}

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.message && <p className="text-sm text-emerald-600">{state.message}</p>}
          <Button type="submit" disabled={pending || !selectedClass} className="w-full">
            {pending ? "Salvando..." : "Registrar chamada"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
