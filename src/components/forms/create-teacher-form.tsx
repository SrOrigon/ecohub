"use client";

import { useActionState, useState } from "react";
import { createTeacherAction } from "@/actions/crud";
import { AvatarUploadField } from "@/components/forms/avatar-upload-field";
import { LocationFields } from "@/components/forms/location-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";

export function CreateTeacherForm() {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await createTeacherAction(formData);
      if (result.success) {
        setOpen(false);
        setFullName("");
      }
      return result;
    },
    null
  );

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        + Novo professor
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Cadastrar professor">
        <form action={formAction} className="space-y-4" encType="multipart/form-data">
          <div>
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Senha inicial</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
              placeholder="Mín. 8 caracteres, letras e números"
            />
          </div>

          <AvatarUploadField previewName={fullName || "Professor"} />

          <LocationFields />

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Cadastrar"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
