"use client";

import { useActionState } from "react";
import { updateExerciseAction } from "@/actions/exercises";
import { Button } from "@/components/ui/button";
import { ToggleExerciseButton } from "@/components/forms/toggle-exercise-button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/form-fields";
import { FormMessage } from "@/components/ui/form-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EditExerciseForm({
  exercise,
}: {
  exercise: {
    id: string;
    title: string;
    description: string | null;
    kind: string;
    maxPoints: number;
    xpReward: number;
    coinReward: number;
    dueDate: string;
    isActive: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      formData.set("id", exercise.id);
      formData.set("isActive", exercise.isActive ? "true" : "false");
      return (await updateExerciseAction(formData)) ?? null;
    },
    null
  );

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="text-base">Editar publicação</CardTitle>
        <ToggleExerciseButton id={exercise.id} isActive={exercise.isActive} />
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="edit-title">Título</Label>
            <Input id="edit-title" name="title" defaultValue={exercise.title} required />
          </div>
          <div>
            <Label htmlFor="edit-desc">Instruções</Label>
            <Textarea id="edit-desc" name="description" defaultValue={exercise.description ?? ""} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-kind">Tipo</Label>
              <Select id="edit-kind" name="kind" defaultValue={exercise.kind}>
                <option value="homework">Exercício de casa</option>
                <option value="exam">Prova</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-due">Prazo</Label>
              <Input id="edit-due" name="dueDate" type="datetime-local" defaultValue={exercise.dueDate} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="edit-pts">Pontuação máx.</Label>
              <Input id="edit-pts" name="maxPoints" type="number" step="0.5" defaultValue={exercise.maxPoints} />
            </div>
            <div>
              <Label htmlFor="edit-xp">XP</Label>
              <Input id="edit-xp" name="xpReward" type="number" defaultValue={exercise.xpReward} />
            </div>
            <div>
              <Label htmlFor="edit-coins">Moedas</Label>
              <Input id="edit-coins" name="coinReward" type="number" defaultValue={exercise.coinReward} />
            </div>
          </div>
          <FormMessage message={state} />
          {state?.success && <p className="text-sm text-emerald-700">Salvo!</p>}
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
