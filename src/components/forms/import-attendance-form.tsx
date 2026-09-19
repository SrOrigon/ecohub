"use client";

import { useActionState, useEffect, useState } from "react";
import { getClassStudentsAction, importAttendanceBatchAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { ATTENDANCE_STATUSES } from "@/lib/constants";

interface ClassOption {
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

export function ImportAttendanceForm({ classes }: { classes: ClassOption[] }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"csv" | "quick">("csv");
  const [csvText, setCsvText] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [quickDate, setQuickDate] = useState("");
  const [studentsList, setStudentsList] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  useEffect(() => {
    if (!open || mode !== "quick" || !selectedClass) {
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
  }, [open, mode, selectedClass, classes]);

  function handleOpen() {
    setOpen(true);
    if (mode === "quick" && selectedClass) {
      setIsLoadingStudents(true);
    }
  }

  function handleClose() {
    setOpen(false);
    setSelectedClass("");
    setStudentsList([]);
    setIsLoadingStudents(false);
  }

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; message?: string } | null, formData: FormData) => {
      if (mode === "quick" && selectedClass && quickDate) {
        const rows = studentsList.map((s) => ({
          date: quickDate,
          studentId: s.id,
          classId: selectedClass,
          status: String(formData.get(`status_${s.id}`) ?? "present"),
        }));
        formData.set("payload", JSON.stringify(rows));
      }
      const result = await importAttendanceBatchAction(formData);
      if (result.success) {
        setCsvText("");
      }
      return result;
    },
    null
  );

  function insertSampleCsv() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const sample = `data,id_aluno_ou_email,status,id_turma
2026-05-10,aluno1@escola.com,present
2026-05-10,aluno2@escola.com,absent
${todayStr},aluno3@escola.com,late`;
    setCsvText(sample);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setCsvText(content);
    };
    reader.readAsText(file);
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen} className="w-full sm:w-auto">
        Importar Histórico
      </Button>
      <Modal open={open} onClose={handleClose} title="Lançamento Retroativo / Importação de Frequência">
        <div className="mb-4 flex gap-2 border-b pb-3">
          <Button
            type="button"
            variant={mode === "csv" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("csv")}
          >
            Importar CSV / Texto
          </Button>
          <Button
            type="button"
            variant={mode === "quick" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("quick")}
          >
            Tabela Rápida Por Turma
          </Button>
        </div>

        <form action={formAction} className="space-y-4">
          {mode === "csv" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Cole dados de frequência histórica (desde maio até hoje) ou faça upload de um arquivo CSV.
              </p>
              <div>
                <Label htmlFor="csvFile">Enviar arquivo CSV</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="mt-1"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="csvData">Dados CSV / Texto</Label>
                  <button
                    type="button"
                    onClick={insertSampleCsv}
                    className="text-xs text-sky-600 hover:underline"
                  >
                    Usar exemplo
                  </button>
                </div>
                <textarea
                  id="csvData"
                  name="csvData"
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`data,email_ou_id,status\n2026-05-15,aluno@escola.com,present`}
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {mode === "quick" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="quick-date">Data da Chamada Retroativa</Label>
                <Input
                  id="quick-date"
                  type="date"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                  min="2024-05-01"
                  required
                />
              </div>
              <div>
                <Label htmlFor="quick-class">Turma</Label>
                <Select
                  id="quick-class"
                  value={selectedClass}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setSelectedClass(cid);
                    setStudentsList([]);
                    if (cid) setIsLoadingStudents(true);
                  }}
                  required
                >
                  <option value="">Selecione a turma...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              {selectedClass !== "" && (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {isLoadingStudents ? (
                    <p className="py-4 text-center text-xs text-slate-500">Carregando alunos da turma...</p>
                  ) : studentsList.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500">Nenhum aluno ativo nesta turma.</p>
                  ) : (
                    studentsList.map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-col gap-2 rounded border border-slate-100 p-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="truncate font-medium">{s.name}</span>
                        <Select name={`status_${s.id}`} defaultValue="present" className="w-full text-xs sm:w-36">
                          {ATTENDANCE_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {statusLabels[st]}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.message && <p className="text-sm text-emerald-600">{state.message}</p>}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Processando importação..." : "Salvar Presenças Retroativas"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
