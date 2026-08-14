"use client";

import { useActionState, useState } from "react";
import { updateInstitutionSubjectsAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";
import { dedupeSubjects, normalizeSubjectName } from "@/lib/institution-subjects";
import { Plus, Trash2 } from "lucide-react";

export function SubjectsManagerForm({
  initialSubjects,
  readOnly = false,
}: {
  initialSubjects: string[];
  readOnly?: boolean;
}) {
  const [subjects, setSubjects] = useState<string[]>(
    initialSubjects.length > 0 ? initialSubjects : [""]
  );
  const [draft, setDraft] = useState("");

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      return await updateInstitutionSubjectsAction(formData);
    },
    null
  );

  function addDraft() {
    const name = normalizeSubjectName(draft);
    if (!name) return;
    setSubjects((current) => dedupeSubjects([...current.filter(Boolean), name]));
    setDraft("");
  }

  function removeAt(index: number) {
    setSubjects((current) => current.filter((_, i) => i !== index));
  }

  function updateAt(index: number, value: string) {
    setSubjects((current) => current.map((item, i) => (i === index ? value : item)));
  }

  const payload = dedupeSubjects(subjects);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="subjectsJson" value={JSON.stringify(payload)} readOnly />

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-slate-700 dark:border-indigo-900 dark:bg-indigo-950/20 dark:text-slate-300">
        <p className="font-medium text-slate-900 dark:text-slate-100">Como funciona</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Escola tradicional: Matemática, Português, História…</li>
          <li>Curso livre: apenas as matérias ofertadas, ex. Programação Web</li>
          <li>Todo o sistema  -  notas, horários, diário, exercícios  -  usa esta lista</li>
        </ul>
      </div>

      {readOnly ? (
        <ul className="space-y-2">
          {payload.length === 0 ? (
            <li className="text-sm text-slate-500">Nenhuma disciplina cadastrada ainda.</li>
          ) : (
            payload.map((subject) => (
              <li
                key={subject}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                {subject}
              </li>
            ))
          )}
        </ul>
      ) : (
        <>
          <div className="space-y-3">
            <Label>Disciplinas cadastradas</Label>
            {subjects.map((subject, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={subject}
                  onChange={(e) => updateAt(index, e.target.value)}
                  placeholder="Ex.: Programação Web"
                  aria-label={`Disciplina ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeAt(index)}
                  aria-label="Remover disciplina"
                  disabled={subjects.length === 1 && !subject.trim()}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nova disciplina"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDraft();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addDraft} className="gap-2 sm:shrink-0">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar
            </Button>
          </div>
        </>
      )}

      <FormMessage message={state} />

      {!readOnly && (
        <Button type="submit" disabled={pending || payload.length === 0} className="w-full sm:w-auto">
          {pending ? "Salvando..." : "Salvar disciplinas"}
        </Button>
      )}
    </form>
  );
}
