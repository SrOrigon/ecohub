"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getStudentsForExerciseAction } from "@/actions/exercise-students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { cn } from "@/lib/utils";

type ClassOption = { id: string; name: string };

export function ExerciseStudentPicker({
  classes,
  classFilter,
  onClassFilterChange,
  selectedStudentIds,
  onSelectedStudentIdsChange,
}: {
  classes: ClassOption[];
  classFilter: string;
  onClassFilterChange: (value: string) => void;
  selectedStudentIds: string[];
  onSelectedStudentIdsChange: (value: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [students, setStudents] = useState<
    Array<{
      id: string;
      fullName: string;
      enrollmentCode: string;
      classLabel: string | null;
      primaryClassId: string | null;
      hasClass: boolean;
      average: number | null;
      lowPerformance: boolean;
    }>
  >([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getStudentsForExerciseAction(classFilter || undefined);
        if ("error" in result && result.error) {
          setLoadError(result.error);
          setStudents([]);
          return;
        }
        setLoadError(null);
        setStudents(result.students ?? []);
      } catch {
        setLoadError("Erro ao carregar alunos. Tente novamente.");
        setStudents([]);
      }
    });
  }, [classFilter]);

  const filteredStudents = useMemo(() => {
    const normalized = query.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
    if (!normalized) return students;
    return students.filter((student) => {
      const haystack = `${student.fullName} ${student.enrollmentCode} ${student.classLabel ?? ""}`
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [students, query]);

  const lowPerformers = useMemo(() => students.filter((student) => student.lowPerformance), [students]);

  function toggleStudent(studentId: string) {
    const student = students.find((row) => row.id === studentId);
    if (student && !student.hasClass) return;
    onSelectedStudentIdsChange(
      selectedStudentIds.includes(studentId)
        ? selectedStudentIds.filter((id) => id !== studentId)
        : [...selectedStudentIds, studentId]
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
      <input type="hidden" name="audienceType" value="personalized" />

      <div>
        <Label htmlFor="student-target-search">Alunos que receberão este exercício</Label>
        <p className="mt-1 text-xs text-slate-600">
          Marque um ou mais alunos. Só eles verão e poderão responder — o restante da turma não recebe.
        </p>
      </div>

      {classes.length > 0 && (
        <div>
          <Label htmlFor="student-class-filter">Filtrar por turma (opcional)</Label>
          <Select
            id="student-class-filter"
            value={classFilter}
            onChange={(event) => {
              onClassFilterChange(event.target.value);
              onSelectedStudentIdsChange([]);
            }}
          >
            <option value="">Todos os alunos disponíveis</option>
            {classes.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={filteredStudents.length === 0}
          onClick={() =>
            onSelectedStudentIdsChange(filteredStudents.filter((student) => student.hasClass).map((student) => student.id))
          }
        >
          Selecionar visíveis ({filteredStudents.length})
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={lowPerformers.length === 0}
          onClick={() => onSelectedStudentIdsChange(lowPerformers.map((student) => student.id))}
        >
          Baixo desempenho ({lowPerformers.length})
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onSelectedStudentIdsChange([])}>
          Limpar
        </Button>
      </div>

      <Input
        id="student-target-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nome ou matrícula..."
        aria-label="Buscar aluno"
      />

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {pending && <p className="text-sm text-slate-500">Carregando alunos...</p>}

      <div className="max-h-52 space-y-2 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white p-2">
        {filteredStudents.length === 0 ? (
          <p className="px-2 py-3 text-sm text-slate-500">Nenhum aluno encontrado.</p>
        ) : (
          filteredStudents.map((student) => {
            const checked = selectedStudentIds.includes(student.id);
            const disabled = !student.hasClass;
            return (
              <label
                key={student.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                  disabled
                    ? "cursor-not-allowed border-amber-200 bg-amber-50/80 opacity-80"
                    : checked
                      ? "cursor-pointer border-indigo-300 bg-indigo-50"
                      : "cursor-pointer border-transparent hover:bg-slate-50"
                )}
              >
                <input
                  type="checkbox"
                  name="studentTargetIds"
                  value={student.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleStudent(student.id)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-slate-900">{student.fullName}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {student.enrollmentCode}
                    {student.hasClass && student.classLabel ? ` · ${student.classLabel}` : " · Sem turma vinculada"}
                    {student.average !== null ? ` · Média ${student.average.toFixed(1)}` : ""}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>

      <p className="text-xs font-medium text-indigo-900">
        {selectedStudentIds.length === 0
          ? "Selecione pelo menos 1 aluno para continuar."
          : `${selectedStudentIds.length} aluno(s) selecionado(s).`}
      </p>
    </div>
  );
}
