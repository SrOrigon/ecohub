"use client";

import { useActionState, useState } from "react";
import { createRewardAction } from "@/actions/rewards";
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
  const activeCategories = categories.filter((c) => c.isActive);
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await createRewardAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    null
  );

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={activeCategories.length === 0}>
        + Novo item na loja
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Cadastrar item na loja de moedas">
        <form action={formAction} className="space-y-4">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Os alunos gastam <strong>moedas</strong> para resgatar. O XP não é usado na loja.
          </p>
          {activeCategories.length === 0 ? (
            <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
              Cadastre pelo menos uma categoria ativa antes de adicionar itens.
            </p>
          ) : (
            <>
              <div>
                <Label htmlFor="categoryId">Categoria</Label>
                <Select id="categoryId" name="categoryId" required defaultValue="">
                  <option value="">Selecione...</option>
                  {activeCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="name">Nome do prêmio</Label>
                <Input id="name" name="name" required placeholder="Ex.: Vale-lanche" />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" placeholder="O que o aluno recebe ao resgatar?" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="coinCost">Preço (moedas)</Label>
                  <Input id="coinCost" name="coinCost" type="number" min="1" defaultValue={50} required />
                </div>
                <div>
                  <Label htmlFor="stock">Estoque (vazio = ilimitado)</Label>
                  <Input id="stock" name="stock" type="number" min="0" placeholder="Ilimitado" />
                </div>
              </div>
            </>
          )}
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending || activeCategories.length === 0} className="w-full">
            {pending ? "Salvando..." : "Cadastrar"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
