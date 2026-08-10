"use client";

import { useActionState, useState } from "react";
import { createParentAction } from "@/actions/parents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";

interface StudentOption {
  id: string;
  name: string;
}

const relations = [
  { value: "mae", label: "Mãe" },
  { value: "pai", label: "Pai" },
  { value: "responsavel", label: "Responsável legal" },
  { value: "avo", label: "Avô/Avó" },
];

export function CreateParentForm({ students }: { students: StudentOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await createParentAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    null
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Novo responsável</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Cadastrar responsável">
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Senha inicial</Label>
            <Input id="password" name="password" type="password" minLength={8} required placeholder="Mín. 8 caracteres, letras e números" />
          </div>
          <div>
            <Label htmlFor="studentId">Vincular a aluno (opcional)</Label>
            <Select id="studentId" name="studentId">
              <option value="">Nenhum agora</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="relation">Parentesco</Label>
            <Select id="relation" name="relation" defaultValue="responsavel">
              {relations.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Cadastrar responsável"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
