"use client";

import { useActionState, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createRewardAction } from "@/actions/rewards";
import { runServerAction } from "@/lib/run-server-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";

export type ShopCategoryOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export function CreateRewardForm({ categories }: { categories: ShopCategoryOption[] }) {
  const router = useRouter();
  const formId = useId();
  const activeCategories = categories.filter((c) => c.isActive);
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await runServerAction(async () => createRewardAction(formData));
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
      <Button type="button" onClick={() => setOpen(true)}>
        + Novo item na loja
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Cadastrar item na loja de moedas">
        <form action={formAction} className="space-y-4">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Os alunos gastam <strong>moedas</strong> para resgatar. O XP não é usado na loja.
          </p>
          {activeCategories.length === 0 ? (
            <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
              Ainda não há categoria ativa. Você pode cadastrar o prêmio agora e vincular uma categoria depois.
            </p>
          ) : (
            <div>
              <Label htmlFor={`${formId}-categoryId`}>Categoria (opcional)</Label>
              <Select id={`${formId}-categoryId`} name="categoryId" defaultValue="">
                <option value="">Sem categoria</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor={`${formId}-name`}>Nome do prêmio</Label>
            <Input id={`${formId}-name`} name="name" required placeholder="Ex.: Vale-lanche" />
          </div>
          <div>
            <Label htmlFor={`${formId}-description`}>Descrição</Label>
            <Textarea
              id={`${formId}-description`}
              name="description"
              placeholder="O que o aluno recebe ao resgatar?"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`${formId}-coinCost`}>Preço (moedas)</Label>
              <Input
                id={`${formId}-coinCost`}
                name="coinCost"
                type="number"
                min="1"
                defaultValue={50}
                required
              />
            </div>
            <div>
              <Label htmlFor={`${formId}-stock`}>Estoque (vazio = ilimitado)</Label>
              <Input id={`${formId}-stock`} name="stock" type="number" min="0" placeholder="Ilimitado" />
            </div>
          </div>
          {state && "error" in state && state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Cadastrar"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
