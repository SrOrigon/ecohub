"use client";

import { useActionState } from "react";
import { resetPlatformUserAction } from "@/actions/platform";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";

export function PlatformResetUserForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; message?: string; success?: boolean } | null, formData: FormData) =>
      (await resetPlatformUserAction(formData)) ?? null,
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resetar cadastro por e-mail</CardTitle>
        <CardDescription>
          Remove a conta (e a instituição, se for diretor) para permitir novo cadastro com o mesmo e-mail ou CNPJ.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <Label htmlFor="resetEmail">E-mail</Label>
            <Input
              id="resetEmail"
              name="email"
              type="email"
              required
              placeholder="usuario@exemplo.com"
              autoComplete="off"
            />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Removendo..." : "Resetar cadastro"}
          </Button>
        </form>
        {state?.error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state?.success && state.message && (
          <p className="mt-3 text-sm text-emerald-700" role="status">
            {state.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
