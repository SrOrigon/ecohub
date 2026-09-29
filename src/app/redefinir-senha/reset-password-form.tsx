"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { AUTH_BACK_LINK_CLASS, AUTH_CARD_CLASS } from "@/components/auth/auth-shell";
import { ArrowLeft } from "lucide-react";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      return await resetPassword(formData);
    },
    null
  );

  return (
    <Card className={AUTH_CARD_CLASS}>
      <CardHeader>
        <Link href="/entrar" className={AUTH_BACK_LINK_CLASS}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para Login
        </Link>
        <CardTitle className="text-xl">Redefinir Senha</CardTitle>
        <CardDescription>
          Digite sua nova senha abaixo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state?.success ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:bg-green-950/50 dark:text-green-200">
              Sua senha foi redefinida com sucesso.
            </div>
            <Link href="/entrar">
              <Button className="w-full">Ir para o Login</Button>
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <div>
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
              />
            </div>
            {state?.error && (
              <p
                className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:bg-red-950/50 dark:text-red-200"
                role="alert"
              >
                {state.error}
              </p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={pending || !token}>
              {pending ? "Redefinindo..." : "Redefinir Senha"}
            </Button>
            {!token && (
              <p className="text-sm text-red-500 mt-2">
                Token de redefinição de senha ausente.
              </p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
