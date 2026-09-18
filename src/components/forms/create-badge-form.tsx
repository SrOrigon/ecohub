"use client";

import { useActionState, useState, useMemo, ChangeEvent } from "react";
import { createBadgeAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { Plus, Award, CheckSquare, Square, Image as ImageIcon } from "lucide-react";

export interface ClassOption {
  id: string;
  name: string;
  gradeLevel?: string | null;
  courseId?: string | null;
}

export function CreateBadgeForm({
  classes,
  requireClass,
}: {
  classes: ClassOption[];
  requireClass?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const courses = useMemo(() => {
    const set = new Map<string, string>();
    classes.forEach((c) => {
      const courseKey = c.courseId || c.gradeLevel || "Curso Geral";
      set.set(courseKey, courseKey);
    });
    return Array.from(set.values());
  }, [classes]);

  const [selectedCourse, setSelectedCourse] = useState<string>(() => courses[0] ?? "");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  const availableClasses = useMemo(() => {
    if (!selectedCourse) return classes;
    return classes.filter((c) => (c.courseId || c.gradeLevel || "Curso Geral") === selectedCourse);
  }, [classes, selectedCourse]);

  function handleCourseChange(course: string) {
    setSelectedCourse(course);
    setSelectedClassIds([]);
  }

  function toggleClass(id: string) {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleAllClasses() {
    if (selectedClassIds.length === availableClasses.length) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(availableClasses.map((c) => c.id));
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await createBadgeAction(formData);
      const next = {
        error: "error" in result ? result.error : undefined,
        success: "success" in result ? result.success : undefined,
      };
      if (next.success) {
        setOpen(false);
        setSelectedClassIds([]);
        setPreviewUrl(null);
      }
      return next;
    },
    null
  );

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={classes.length === 0 && requireClass}
        className="gap-1.5 shadow-xs"
      >
        <Plus className="h-4 w-4" />
        Nova atitude
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova atitude">
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="badge-name">Nome</Label>
            <Input id="badge-name" name="name" required placeholder="Ex.: Pontualidade exemplar" />
          </div>
          <div>
            <Label htmlFor="badge-description">Descrição</Label>
            <Textarea id="badge-description" name="description" placeholder="Critérios para conceder esta atitude ao aluno..." />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="badge-xp">XP (+ / -)</Label>
              <Input id="badge-xp" name="xpRequired" type="number" defaultValue={100} placeholder="Ex: 100 ou -50" />
            </div>
            <div>
              <Label htmlFor="badge-coins">Moedas (+ / -)</Label>
              <Input id="badge-coins" name="coinsReward" type="number" defaultValue={20} placeholder="Ex: 20 ou -10" />
            </div>
            <div>
              <Label htmlFor="badge-icon">Ícone Padrão</Label>
              <Select id="badge-icon" name="icon" defaultValue="star">
                <option value="star">★ Estrela</option>
                <option value="clock">⏱ Relógio</option>
                <option value="target">🎯 Alvo</option>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="badge-image-file" className="flex items-center gap-1.5 text-xs font-semibold">
                <ImageIcon className="h-4 w-4 text-indigo-500" />
                Imagem / Emblema personalizado (opcional)
              </Label>
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remover prévia
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Prévia do emblema"
                  className="h-12 w-12 rounded-full object-cover border-2 border-indigo-500 shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <input
                  id="badge-image-file"
                  type="file"
                  name="badgeImage"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300 hover:file:bg-indigo-100"
                />
                <Input
                  name="imageUrl"
                  placeholder="Ou informe a URL da imagem (https://...)"
                  className="text-xs h-8"
                  onChange={(e) => {
                    if (e.target.value.startsWith("http")) {
                      setPreviewUrl(e.target.value);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="badge-course">Curso / Modalidade</Label>
            <Select
              id="badge-course"
              name="courseId"
              value={selectedCourse}
              onChange={(e) => handleCourseChange(e.target.value)}
            >
              {!requireClass && <option value="">Toda a escola (Geral)</option>}
              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Turmas do curso</Label>
              {availableClasses.length > 1 && (
                <button
                  type="button"
                  onClick={toggleAllClasses}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {selectedClassIds.length === availableClasses.length ? "Desmarcar todas" : "Selecionar todas"}
                </button>
              )}
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-lg border border-slate-200 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-900/50">
              {availableClasses.length === 0 ? (
                <p className="text-xs text-slate-500 p-2">Nenhuma turma disponível para este curso.</p>
              ) : (
                availableClasses.map((c) => {
                  const isChecked = selectedClassIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        name="classIds"
                        value={c.id}
                        checked={isChecked}
                        onChange={() => toggleClass(c.id)}
                        className="sr-only"
                      />
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <span>{c.name}</span>
                    </label>
                  );
                })
              )}
            </div>
            {requireClass && selectedClassIds.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Selecione ao menos uma turma para a atitude.
              </p>
            )}
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button
            type="submit"
            disabled={pending || (requireClass && selectedClassIds.length === 0)}
            className="w-full gap-2"
          >
            <Award className="h-4 w-4" />
            {pending ? "Criando..." : "Criar atitude"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
