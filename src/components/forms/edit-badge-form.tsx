"use client";

import { useActionState, useState } from "react";
import { updateBadgeAction, deleteBadgeAction } from "@/actions/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";

interface ClassOption {
  id: string;
  name: string;
}

interface BadgeData {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  xpRequired: number;
  classId: string | null;
}

export function EditBadgeForm({
  badge,
  classes,
  requireClass,
}: {
  badge: BadgeData;
  classes: ClassOption[];
  requireClass?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateBadgeAction(formData);
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
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Editar
      </Button>
      <DeleteConfirmButton
        label="Excluir"
        confirmMessage={`Excluir a atitude "${badge.name}"? Os alunos que já a receberam perderão esta conquista. Esta ação não pode ser desfeita.`}
        hiddenFields={{ badgeId: badge.id }}
        action={deleteBadgeAction}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Editar atitude">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="badgeId" value={badge.id} />
          <div>
            <Label htmlFor={`badge-name-${badge.id}`}>Nome</Label>
            <Input id={`badge-name-${badge.id}`} name="name" defaultValue={badge.name} required />
          </div>
          <div>
            <Label htmlFor={`badge-desc-${badge.id}`}>Descrição</Label>
            <Textarea
              id={`badge-desc-${badge.id}`}
              name="description"
              defaultValue={badge.description ?? ""}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`badge-xp-${badge.id}`}>XP ao aplicar</Label>
              <Input
                id={`badge-xp-${badge.id}`}
                name="xpRequired"
                type="number"
                min={0}
                defaultValue={badge.xpRequired}
              />
            </div>
            <div>
              <Label htmlFor={`badge-icon-${badge.id}`}>Ícone</Label>
              <Select id={`badge-icon-${badge.id}`} name="icon" defaultValue={badge.icon}>
                <option value="star">Estrela</option>
                <option value="clock">Relógio</option>
                <option value="target">Alvo</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor={`badge-class-${badge.id}`}>Turma</Label>
            <Select
              id={`badge-class-${badge.id}`}
              name="classId"
              required={requireClass}
              defaultValue={badge.classId ?? ""}
            >
              {!requireClass && <option value="">Toda a escola</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
