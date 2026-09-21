"use client";

import { useActionState, useState } from "react";
import { recordAttendanceAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { useToday } from "@/hooks/use-today";
import { ATTENDANCE_STATUSES } from "@/lib/constants";

interface StudentOption {
  id: string;
  name: string;
  classId: string | null;
}

const statusLabels: Record<string, string> = {
  present: "Presente",
  absent: "Falta",
  late: "Atraso",
  justified: "Justificada",
};

export function RecordAttendanceForm({ students }: { students: StudentOption[] }) {
  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await recordAttendanceAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    null
  );

  const today = useToday();
  const classId = students.find((s) => s.id === selectedStudent)?.classId ?? "";

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">+ Registrar frequência</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar frequência">
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="date">Data</Label>
            <Input id="date" name="date" type="date" defaultValue={today} min="2024-05-01" max={today} required />
          </div>
          <div>
            <Label htmlFor="studentId">Aluno</Label>
            <Select
              id="studentId"
              name="studentId"
              required
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="">Selecione...</option>
              {students.filter((s) => s.classId).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <input type="hidden" name="classId" value={classId} />
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" required defaultValue="present">
              {ATTENDANCE_STATUSES.map((s) => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </Select>
          </div>
          {state?.error && (
            <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">
              {state.error}
            </div>
          )}
          <Button type="submit" disabled={pending || !classId} className="w-full">
            {pending ? "Salvando..." : "Registrar"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
