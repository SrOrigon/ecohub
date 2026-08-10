"use client";

import { useActionState, useState } from "react";
import { createTeacherAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";

export function CreateTeacherForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await createTeacherAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    null
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Novo professor</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Cadastrar professor">
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
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Cadastrar"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
