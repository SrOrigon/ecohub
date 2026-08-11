"use client";

import { useActionState, useState } from "react";
import { updateStudentAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";

interface ClassOption {
  id: string;
  name: string;
}

export function EditStudentForm({
  studentId,
  currentClassId,
  classes,
}: {
  studentId: string;
  currentClassId: string | null;
  classes: ClassOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateStudentAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    null
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Editar turma / curso
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar aluno">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="studentId" value={studentId} />
          <div>
            <Label htmlFor="classId">Turma / curso</Label>
            <Select id="classId" name="classId" defaultValue={currentClassId ?? ""}>
              <option value="">Sem turma / curso</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="text-sm text-emerald-600">Atualizado!</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
