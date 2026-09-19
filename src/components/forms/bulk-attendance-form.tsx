"use client";

import { useActionState, useEffect, useState } from "react";
import { bulkAttendanceAction, getClassStudentsAction } from "@/actions/crud";
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
  const [studentsList, setStudentsList] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; message?: string } | null, formData: FormData) => {
      const result = await bulkAttendanceAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    null
  );

  const today = useToday();

  useEffect(() => {
    if (!open || !selectedClass) {
      return;
    }

    let isMounted = true;

    getClassStudentsAction(selectedClass)
      .then((res) => {
        if (isMounted) {
          if (res.success && res.students) {
            setStudentsList(res.students);
          } else {
            const fallback = classes.find((c) => c.id === selectedClass)?.students ?? [];
            setStudentsList(fallback);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          const fallback = classes.find((c) => c.id === selectedClass)?.students ?? [];
          setStudentsList(fallback);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingStudents(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, selectedClass, classes]);

  function handleOpen() {
    setOpen(true);
    if (selectedClass) {
      setIsLoadingStudents(true);
    }
  }

  function handleClose() {
    setOpen(false);
    setSelectedClass("");
    setStudentsList([]);
    setIsLoadingStudents(false);
  }

  return (
    <>
      <Button variant="secondary" onClick={handleOpen} className="w-full sm:w-auto">
        Chamada por turma
      </Button>
      <Modal open={open} onClose={handleClose} title="Chamada em lote">
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
              onChange={(e) => {
                const cid = e.target.value;
                setSelectedClass(cid);
                setStudentsList([]);
                if (cid) setIsLoadingStudents(true);
              }}
            >
              <option value="">Selecione a turma...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>

          {selectedClass !== "" && (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-3">
              {isLoadingStudents ? (
                <p className="py-4 text-center text-xs text-slate-500">Carregando alunos da turma...</p>
              ) : studentsList.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">Nenhum aluno ativo nesta turma.</p>
              ) : (
                studentsList.map((s) => (
                  <div key={s.id} className="flex flex-col gap-2 rounded-lg border border-slate-100 p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0 truncate font-medium">{s.name}</span>
                    <Select name={`status_${s.id}`} defaultValue="present" className="min-h-11 w-full shrink-0 text-base sm:w-36">
                      {ATTENDANCE_STATUSES.map((st) => (
                        <option key={st} value={st}>{statusLabels[st]}</option>
                      ))}
                    </Select>
                  </div>
                ))
              )}
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
