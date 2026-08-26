"use client";

import { useActionState, useState } from "react";
import { updateStudentAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { StudentProfileFields, type StudentProfileFieldValues } from "@/components/forms/student-profile-fields";

interface ClassOption {
  id: string;
  name: string;
}

export function EditStudentForm({
  studentId,
  currentClassId,
  classes,
  currentEmail,
  profile,
  accountType,
  currentStatus = "active",
}: {
  studentId: string;
  currentClassId: string | null;
  classes: ClassOption[];
  currentEmail: string;
  profile: StudentProfileFieldValues;
  accountType?: string;
  currentStatus?: string;
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
        Editar perfil
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar perfil do aluno" size="lg">
        <form action={formAction} className="space-y-4" encType="multipart/form-data">
          <input type="hidden" name="studentId" value={studentId} />
          <StudentProfileFields idPrefix="edit-student" values={profile} showStreetAddress />
          {accountType !== "pin_only" && (
            <div>
              <Label htmlFor="edit-student-email">E-mail</Label>
              <Input id="edit-student-email" name="email" type="email" defaultValue={currentEmail} />
            </div>
          )}
          <div>
            <Label htmlFor="classId">Turma / curso</Label>
            <Select id="classId" name="classId" defaultValue={currentClassId ?? ""}>
              <option value="">Sem turma / curso</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status da matrícula</Label>
            <Select id="status" name="status" defaultValue={currentStatus === "inactive" ? "inactive" : "active"}>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-student-password">Nova senha (opcional)</Label>
            <Input
              id="edit-student-password"
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="Deixe em branco para manter a senha atual"
            />
            <p className="mt-1 text-xs text-slate-500">A senha é armazenada apenas como hash seguro, nunca em texto puro.</p>
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="text-sm text-emerald-600">Atualizado!</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Salvar perfil"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
