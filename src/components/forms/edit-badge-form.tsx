"use client";

import { useActionState, useState, useMemo, ChangeEvent } from "react";
import { updateBadgeAction, deleteBadgeAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { Pencil, CheckSquare, Square, Image as ImageIcon } from "lucide-react";

export interface ClassOption {
  id: string;
  name: string;
  gradeLevel?: string | null;
  courseId?: string | null;
}

export interface BadgeData {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  imageUrl?: string | null;
  xpRequired: number;
  coinsReward?: number;
  courseId?: string | null;
  classId: string | null;
  classes?: Array<{ classId: string; classGroup?: { id: string; name: string; gradeLevel?: string | null; courseId?: string | null } }>;
}

export function EditBadgeForm({
  badge,
  classes,
  requireClass,
  compact = false,
}: {
  badge: BadgeData;
  classes: ClassOption[];
  requireClass?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(badge.imageUrl ?? null);
  const [removeBadgeImage, setRemoveBadgeImage] = useState(false);

  const courses = useMemo(() => {
    const set = new Map<string, string>();
    classes.forEach((c) => {
      const courseKey = c.courseId || c.gradeLevel || "Curso Geral";
      set.set(courseKey, courseKey);
    });
    return Array.from(set.values());
  }, [classes]);

  const initialClassIds = useMemo(() => {
    const ids = new Set<string>();
    if (badge.classId) ids.add(badge.classId);
    if (badge.classes) badge.classes.forEach((bc) => ids.add(bc.classId));
    return Array.from(ids);
  }, [badge]);

  const initialCourse = useMemo(() => {
    if (badge.courseId) return badge.courseId;
    if (initialClassIds.length > 0) {
      const match = classes.find((c) => initialClassIds.includes(c.id));
      if (match) return match.courseId || match.gradeLevel || "Curso Geral";
    }
    return courses[0] ?? "";
  }, [badge, initialClassIds, classes, courses]);

  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourse);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(initialClassIds);

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
      setRemoveBadgeImage(false);
    }
  }

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      if (removeBadgeImage) {
        formData.set("removeBadgeImage", "1");
      }
      const result = await updateBadgeAction(formData);
      const next = {
        error: "error" in result ? result.error : undefined,
        success: "success" in result ? result.success : undefined,
      };
      if (next.success) setOpen(false);
      return next;
    },
    null
  );

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size={compact ? "icon" : "sm"}
        variant="ghost"
        className={
          compact
            ? "h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
            : "h-8 px-2.5 text-xs"
        }
        onClick={() => setOpen(true)}
        title="Editar atitude"
      >
        {compact ? <Pencil className="h-3.5 w-3.5" /> : "Editar"}
      </Button>
      <DeleteConfirmButton
        label="Excluir"
        iconOnly={compact}
        size={compact ? "icon" : "sm"}
        className={
          compact
            ? "h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            : "h-8 px-2 text-xs"
        }
        confirmMessage={`Excluir a atitude "${badge.name}"? Os alunos que já a receberam perderão esta conquista. Esta ação não pode ser desfeita.`}
        hiddenFields={{ badgeId: badge.id }}
        action={deleteBadgeAction}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Editar atitude">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="badgeId" value={badge.id} />
          <div>
            <Label htmlFor={`badge-name-${badge.id}`}>Nome</Label>
            <Input id={`badge-name-${badge.id}`} name="name" defaultValue={badge.name} required />
          </div>
          <div>
            <Label htmlFor={`badge-desc-${badge.id}`}>Descrição</Label>
            <Textarea
              id={`badge-desc-${badge.id}`}
              name="description"
              defaultValue={badge.description ?? ""}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor={`badge-xp-${badge.id}`}>XP (+ / -)</Label>
              <Input
                id={`badge-xp-${badge.id}`}
                name="xpRequired"
                type="number"
                defaultValue={badge.xpRequired}
                placeholder="Ex: 100 ou -50"
              />
            </div>
            <div>
              <Label htmlFor={`badge-coins-${badge.id}`}>Moedas (+ / -)</Label>
              <Input
                id={`badge-coins-${badge.id}`}
                name="coinsReward"
                type="number"
                defaultValue={badge.coinsReward ?? 0}
                placeholder="Ex: 20 ou -10"
              />
            </div>
            <div>
              <Label htmlFor={`badge-icon-${badge.id}`}>Ícone Padrão</Label>
              <Select id={`badge-icon-${badge.id}`} name="icon" defaultValue={badge.icon}>
                <option value="star">★ Estrela</option>
                <option value="clock">⏱ Relógio</option>
                <option value="target">🎯 Alvo</option>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`badge-img-file-${badge.id}`} className="flex items-center gap-1.5 text-xs font-semibold">
                <ImageIcon className="h-4 w-4 text-indigo-500" />
                Imagem / Emblema personalizado
              </Label>
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewUrl(null);
                    setRemoveBadgeImage(true);
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remover imagem
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
                  id={`badge-img-file-${badge.id}`}
                  type="file"
                  name="badgeImage"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300 hover:file:bg-indigo-100"
                />
                <Input
                  name="imageUrl"
                  defaultValue={badge.imageUrl ?? ""}
                  placeholder="Ou informe a URL da imagem (https://...)"
                  className="text-xs h-8"
                  onChange={(e) => {
                    if (e.target.value.startsWith("http")) {
                      setPreviewUrl(e.target.value);
                      setRemoveBadgeImage(false);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor={`badge-course-${badge.id}`}>Curso / Modalidade</Label>
            <Select
              id={`badge-course-${badge.id}`}
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
            className="w-full"
          >
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
