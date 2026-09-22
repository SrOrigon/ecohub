"use client";

import { useEffect, useState, FormEvent } from "react";
import { bulkAttendanceAction, getClassStudentsAction } from "@/actions/crud";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { useToday } from "@/hooks/use-today";
import { ATTENDANCE_STATUSES } from "@/lib/constants";
import { getOfflineSnapshot, saveOfflineSnapshot } from "@/lib/offline-storage";
import { WifiOff } from "lucide-react";

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
  const [isOfflineCached, setIsOfflineCached] = useState(false);

  const { mutate } = useOfflineMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultState, setResultState] = useState<{ error?: string; message?: string; queued?: boolean } | null>(
    null
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setResultState(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await mutate("bulkAttendanceAction", formData, bulkAttendanceAction);
      if (res.success) {
        if (res.queued) {
          setResultState({
            queued: true,
            message: res.message ?? "Chamada salva offline. Sincronização pendente.",
          });
        } else {
          setResultState({ message: res.message ?? "Chamada registrada com sucesso!" });
          setTimeout(() => handleClose(), 1200);
        }
      } else {
        setResultState({ error: res.error ?? "Erro ao registrar chamada." });
      }
    } catch {
      setResultState({ error: "Erro de conexão ao processar requisição." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const today = useToday();

  useEffect(() => {
    if (!open || !selectedClass) {
      return;
    }

    let isMounted = true;

    getClassStudentsAction(selectedClass)
      .then((res) => {
        if (isMounted) {
          if (res.success && res.students && res.students.length > 0) {
            setStudentsList(res.students);
            saveOfflineSnapshot(`cached_students_${selectedClass}`, res.students);
            setIsOfflineCached(false);
          } else {
            const snapshot = getOfflineSnapshot<{ id: string; name: string }[]>(`cached_students_${selectedClass}`);
            const fallback = snapshot?.data ?? classes.find((c) => c.id === selectedClass)?.students ?? [];
            setStudentsList(fallback);
            setIsOfflineCached(!!snapshot?.data);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          const snapshot = getOfflineSnapshot<{ id: string; name: string }[]>(`cached_students_${selectedClass}`);
          const fallback = snapshot?.data ?? classes.find((c) => c.id === selectedClass)?.students ?? [];
          setStudentsList(fallback);
          setIsOfflineCached(true);
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
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {isOfflineCached && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
              <WifiOff className="h-3.5 w-3.5" />
              Exibindo dados em cache (Offline)
            </div>
          )}

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

          {resultState?.error && <p className="text-sm text-red-600">{resultState.error}</p>}
          {resultState?.message && (
            <p className={`text-sm ${resultState.queued ? "text-amber-700 font-medium" : "text-emerald-600"}`}>
              {resultState.message}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting || !selectedClass} className="w-full">
            {isSubmitting ? "Salvando..." : "Registrar chamada"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
