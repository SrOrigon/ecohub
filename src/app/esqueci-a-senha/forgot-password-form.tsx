"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { AUTH_BACK_LINK_CLASS, AUTH_CARD_CLASS } from "@/components/auth/auth-shell";
import { ArrowLeft } from "lucide-react";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      return await requestPasswordReset(formData);
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
        <CardTitle className="text-xl">Esqueci a Senha</CardTitle>
        <CardDescription>
          Digite seu e-mail para receber um link de redefinição de senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state?.success ? (
          <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:bg-green-950/50 dark:text-green-200">
            Se uma conta com este e-mail existir, você receberá instruções para redefinir sua senha.
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
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
            <Button type="submit" className="w-full" size="lg" disabled={pending}>
              {pending ? "Enviando..." : "Enviar Link"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
