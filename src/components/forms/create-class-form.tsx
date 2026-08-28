"use client";

import { useActionState, useState } from "react";
import { createClassAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { GraduationCap } from "lucide-react";

interface TeacherOption {
  id: string;
  fullName: string;
}

export function CreateClassForm({
  teachers = [],
  allTeachers = [],
  teacherMode = false,
}: {
  teachers?: TeacherOption[];
  allTeachers?: TeacherOption[];
  teacherMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await createClassAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    null
  );

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <GraduationCap className="h-4 w-4" aria-hidden="true" />
        {teacherMode ? "Cadastrar turma" : "+ Nova turma"}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Cadastrar turma">
        <form action={formAction} className="space-y-4">
          {teacherMode && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Você será o professor responsável. Depois publique exercícios para toda a turma de uma vez.
            </p>
          )}
          <div>
            <Label htmlFor="name">Nome da turma</Label>
            <Input id="name" name="name" placeholder="8º Ano A" required />
          </div>
          <div>
            <Label htmlFor="gradeLevel">Série / período / horário</Label>
            <Input id="gradeLevel" name="gradeLevel" placeholder="Sexta-feira · 08h às 10h" required />
          </div>
          <div>
            <Label htmlFor="year">Ano letivo</Label>
            <Input id="year" name="year" type="number" defaultValue={2026} required />
          </div>
          {!teacherMode && teachers.length > 0 && (
            <div>
              <Label htmlFor="teacherId">Professor responsável</Label>
              <Select id="teacherId" name="teacherId">
                <option value="">Nenhum</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName}</option>
                ))}
              </Select>
            </div>
          )}
          {!teacherMode && allTeachers.length > 1 && (
            <div>
              <Label>Co-docentes (opcional)</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {allTeachers.map((t) => (
                  <label key={t.id} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name="coTeacherIds" value={t.id} />
                    {t.fullName}
                  </label>
                ))}
              </div>
            </div>
          )}
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.success && (
            <p className="text-sm text-emerald-600">Turma criada! Já pode publicar exercícios para ela.</p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Cadastrar turma"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
