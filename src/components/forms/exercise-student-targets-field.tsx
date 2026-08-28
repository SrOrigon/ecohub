"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getClassStudentsForExerciseAction } from "@/actions/exercise-students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { PERSONALIZATION_TAGS, type ExerciseAudienceType } from "@/lib/exercise-audience";
import { cn } from "@/lib/utils";

export function ExerciseStudentTargetsField({
  classId,
  audienceType,
  onAudienceTypeChange,
  personalizationTag,
  onPersonalizationTagChange,
  selectedStudentIds,
  onSelectedStudentIdsChange,
}: {
  classId: string;
  audienceType: ExerciseAudienceType;
  onAudienceTypeChange: (value: ExerciseAudienceType) => void;
  personalizationTag: string;
  onPersonalizationTagChange: (value: string) => void;
  selectedStudentIds: string[];
  onSelectedStudentIdsChange: (value: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [students, setStudents] = useState<
    Array<{ id: string; fullName: string; enrollmentCode: string; average: number | null; lowPerformance: boolean }>
  >([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    startTransition(async () => {
      const result = await getClassStudentsForExerciseAction(classId);
      if ("error" in result && result.error) {
        setLoadError(result.error);
        setStudents([]);
        return;
      }
      setLoadError(null);
      setStudents(result.students ?? []);
    });
  }, [classId]);

  const filteredStudents = useMemo(() => {
    const normalized = query.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
    if (!normalized) return students;
    return students.filter((student) => {
      const haystack = `${student.fullName} ${student.enrollmentCode}`.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [students, query]);

  const lowPerformers = useMemo(() => students.filter((student) => student.lowPerformance), [students]);

  function toggleStudent(studentId: string) {
    onSelectedStudentIdsChange(
      selectedStudentIds.includes(studentId)
        ? selectedStudentIds.filter((id) => id !== studentId)
        : [...selectedStudentIds, studentId]
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div>
        <Label htmlFor="audienceType">Destinatários</Label>
        <select
          id="audienceType"
          name="audienceType"
          value={audienceType}
          onChange={(event) => onAudienceTypeChange(event.target.value as ExerciseAudienceType)}
          className="mt-1 flex min-h-11 w-full rounded-xl border-2 border-[var(--border)] bg-[var(--input-bg)] px-4 py-2 text-base"
        >
          <option value="class">Toda a turma (atividade comum)</option>
          <option value="personalized">Alunos selecionados (personalizado)</option>
        </select>
        <p className="mt-1 text-xs text-slate-600">
          Use &quot;personalizado&quot; para adaptações (NEE, reforço, baixo desempenho) sem expor o restante da turma.
        </p>
      </div>

      {audienceType === "personalized" && (
        <>
          <div>
            <Label htmlFor="personalizationTag">Etiqueta pedagógica (opcional)</Label>
            <select
              id="personalizationTag"
              name="personalizationTag"
              value={personalizationTag}
              onChange={(event) => onPersonalizationTagChange(event.target.value)}
              className="mt-1 flex min-h-11 w-full rounded-xl border-2 border-[var(--border)] bg-white px-4 py-2 text-base"
            >
              {PERSONALIZATION_TAGS.map((tag) => (
                <option key={tag.value || "none"} value={tag.value}>
                  {tag.label}
                </option>
              ))}
            </select>
          </div>

          {!classId ? (
            <p className="text-sm text-amber-700">Selecione a turma acima para escolher os alunos.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={students.length === 0}
                  onClick={() => onSelectedStudentIdsChange(students.map((student) => student.id))}
                >
                  Selecionar todos ({students.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={lowPerformers.length === 0}
                  onClick={() => onSelectedStudentIdsChange(lowPerformers.map((student) => student.id))}
                >
                  Sugerir baixo desempenho ({lowPerformers.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onSelectedStudentIdsChange([])}
                >
                  Limpar
                </Button>
              </div>

              <div>
                <Label htmlFor="student-target-search">Buscar aluno</Label>
                <Input
                  id="student-target-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nome ou matrícula..."
                  className="mt-1"
                />
              </div>

              {loadError && <p className="text-sm text-red-600">{loadError}</p>}
              {pending && <p className="text-sm text-slate-500">Carregando alunos...</p>}

              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
                {filteredStudents.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-slate-500">Nenhum aluno encontrado nesta turma.</p>
                ) : (
                  filteredStudents.map((student) => {
                    const checked = selectedStudentIds.includes(student.id);
                    return (
                      <label
                        key={student.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                          checked ? "border-indigo-300 bg-indigo-50" : "border-transparent hover:bg-slate-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          name="studentTargetIds"
                          value={student.id}
                          checked={checked}
                          onChange={() => toggleStudent(student.id)}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-medium text-slate-900">{student.fullName}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {student.enrollmentCode}
                            {student.average !== null ? ` · Média ${student.average.toFixed(1)}` : " · Sem notas"}
                            {student.lowPerformance ? " · Baixo desempenho" : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-slate-600">
                {selectedStudentIds.length} aluno(s) selecionado(s). Só eles verão este exercício.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
