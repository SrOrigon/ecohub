"use client";

import { useActionState, useState } from "react";
import { importAttendanceBatchAction } from "@/actions/crud";
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

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; message?: string } | null, formData: FormData) => {
      if (mode === "quick" && selectedClass && quickDate) {
        const classData = classes.find((c) => c.id === selectedClass);
        if (classData) {
          const rows = classData.students.map((s) => ({
            date: quickDate,
            studentId: s.id,
            classId: selectedClass,
            status: String(formData.get(`status_${s.id}`) ?? "present"),
          }));
          formData.set("payload", JSON.stringify(rows));
        }
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

  const selectedClassObj = classes.find((c) => c.id === selectedClass);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        Importar Histórico
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Lançamento Retroativo / Importação de Frequência">
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
                  onChange={(e) => setSelectedClass(e.target.value)}
                  required
                >
                  <option value="">Selecione a turma...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.students.length} alunos)
                    </option>
                  ))}
                </Select>
              </div>

              {selectedClassObj && (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {selectedClassObj.students.map((s) => (
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
                  ))}
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
