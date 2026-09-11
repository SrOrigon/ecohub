"use client";

import { useActionState, useState } from "react";
import { createBadgeAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";

interface ClassOption {
  id: string;
  name: string;
}

export function CreateBadgeForm({
  classes,
  requireClass,
}: {
  classes: ClassOption[];
  requireClass?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await createBadgeAction(formData);
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
    <>
      <Button onClick={() => setOpen(true)} disabled={classes.length === 0 && requireClass}>
        + Nova atitude
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova atitude">
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="badge-name">Nome</Label>
            <Input id="badge-name" name="name" required placeholder="Ex.: Pontualidade" />
          </div>
          <div>
            <Label htmlFor="badge-description">Descrição</Label>
            <Textarea id="badge-description" name="description" placeholder="Quando aplicar esta atitude" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="badge-xp">XP ao aplicar</Label>
              <Input id="badge-xp" name="xpRequired" type="number" min={0} defaultValue={100} />
            </div>
            <div>
              <Label htmlFor="badge-icon">Ícone</Label>
              <Select id="badge-icon" name="icon" defaultValue="star">
                <option value="star">Estrela</option>
                <option value="clock">Relógio</option>
                <option value="target">Alvo</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="badge-class">Turma</Label>
            <Select id="badge-class" name="classId" required={requireClass} defaultValue={classes.length === 1 ? classes[0].id : ""}>
              {!requireClass && <option value="">Toda a escola</option>}
              {requireClass && (
                <option value="" disabled>
                  Selecione a turma...
                </option>
              )}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Criando..." : "Criar atitude"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
