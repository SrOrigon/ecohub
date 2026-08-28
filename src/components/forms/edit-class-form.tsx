"use client";

import { useActionState, useState } from "react";
import { updateClassAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { Pencil } from "lucide-react";
import { sortByTextPt } from "@/lib/sort-order";

interface TeacherOption {
  id: string;
  fullName: string;
}

export type EditableClass = {
  id: string;
  name: string;
  gradeLevel: string;
  year: number;
  teacherId: string | null;
  coTeacherIds: string[];
};

export function EditClassForm({
  turma,
  teachers = [],
  teacherMode = false,
}: {
  turma: EditableClass;
  teachers?: TeacherOption[];
  teacherMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const sortedTeachers = sortByTextPt(teachers, (teacher) => teacher.fullName);
  const coTeacherOptions = sortedTeachers.filter((teacher) => teacher.id !== turma.teacherId);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateClassAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    null
  );

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Editar
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Editar turma — ${turma.name}`}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="classId" value={turma.id} />
          <div>
            <Label htmlFor={`class-name-${turma.id}`}>Nome da turma / curso</Label>
            <Input
              id={`class-name-${turma.id}`}
              name="name"
              defaultValue={turma.name}
              placeholder="Design de Games Kids"
              required
            />
          </div>
          <div>
            <Label htmlFor={`class-grade-${turma.id}`}>Série / período / horário</Label>
            <Input
              id={`class-grade-${turma.id}`}
              name="gradeLevel"
              defaultValue={turma.gradeLevel}
              placeholder="Sexta-feira · 08h às 10h"
              required
            />
          </div>
          <div>
            <Label htmlFor={`class-year-${turma.id}`}>Ano letivo</Label>
            <Input
              id={`class-year-${turma.id}`}
              name="year"
              type="number"
              defaultValue={turma.year}
              required
            />
          </div>
          {!teacherMode && sortedTeachers.length > 0 && (
            <div>
              <Label htmlFor={`class-teacher-${turma.id}`}>Professor responsável</Label>
              <Select
                id={`class-teacher-${turma.id}`}
                name="teacherId"
                defaultValue={turma.teacherId ?? ""}
              >
                <option value="">Nenhum</option>
                {sortedTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {!teacherMode && coTeacherOptions.length > 0 && (
            <div>
              <Label>Co-docentes (opcional)</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {coTeacherOptions.map((teacher) => (
                  <label key={teacher.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      name="coTeacherIds"
                      value={teacher.id}
                      defaultChecked={turma.coTeacherIds.includes(teacher.id)}
                    />
                    {teacher.fullName}
                  </label>
                ))}
              </div>
            </div>
          )}
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="text-sm text-emerald-600">Turma atualizada com sucesso.</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
