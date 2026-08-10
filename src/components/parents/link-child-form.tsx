"use client";

import { useActionState } from "react";
import { linkChildByEnrollmentAction } from "@/actions/parents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2 } from "lucide-react";

export function LinkChildForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean; studentName?: string } | null, formData: FormData) =>
      (await linkChildByEnrollmentAction(formData)) ?? null,
    null
  );

  return (
    <Card className="border-sky-200 dark:border-sky-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-5 w-5 text-sky-600" aria-hidden="true" />
          Vincular filho(a) já matriculado
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state?.success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            <strong>{state.studentName}</strong> foi vinculado ao seu perfil. Os comunicados e avisos da turma
            dele(a) já aparecem no mural.
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Use a matrícula informada pela escola para acompanhar um filho que já está cadastrado no sistema.
            </p>
            <div>
              <Label htmlFor="enrollmentCode">Matrícula do aluno</Label>
              <Input
                id="enrollmentCode"
                name="enrollmentCode"
                placeholder="Ex.: 2026001"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="linkRelation">Seu vínculo</Label>
              <Select id="linkRelation" name="relation" defaultValue="responsavel">
                <option value="mae">Mãe</option>
                <option value="pai">Pai</option>
                <option value="responsavel">Responsável legal</option>
                <option value="avo">Avô/Avó</option>
              </Select>
            </div>
            {state?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">
                {state.error}
              </p>
            )}
            <Button type="submit" disabled={pending} variant="outline" className="w-full">
              {pending ? "Vinculando..." : "Vincular filho(a)"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
