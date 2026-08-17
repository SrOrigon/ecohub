"use client";

import { useActionState, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createRewardCategoryAction } from "@/actions/reward-categories";
import { runServerAction } from "@/lib/run-server-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";

export function CreateRewardCategoryForm({
  variant = "outline",
  size = "sm",
  label = "+ Nova categoria",
}: {
  variant?: "outline" | "default";
  size?: "sm" | "default";
  label?: string;
}) {
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await runServerAction(async () => createRewardCategoryAction(formData));
      if (result && "success" in result && result.success) {
        setOpen(false);
        router.refresh();
      }
      return result;
    },
    null
  );

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} variant={variant} size={size}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova categoria da loja">
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor={`${formId}-name`}>Nome</Label>
            <Input id={`${formId}-name`} name="name" required placeholder="Ex.: Lanches" />
          </div>
          <div>
            <Label htmlFor={`${formId}-description`}>Descrição (opcional)</Label>
            <Textarea
              id={`${formId}-description`}
              name="description"
              rows={2}
              placeholder="O que entra nesta categoria?"
            />
          </div>
          <div>
            <Label htmlFor={`${formId}-sortOrder`}>Ordem na vitrine</Label>
            <Input id={`${formId}-sortOrder`} name="sortOrder" type="number" min="0" defaultValue={0} />
            <p className="mt-1 text-xs text-slate-500">Menor número aparece primeiro para os alunos.</p>
          </div>
          {state && "error" in state && state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Criar categoria"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
