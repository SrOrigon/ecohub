"use client";

import { useActionState } from "react";
import Link from "next/link";
import { acceptTeacherInviteAction } from "@/actions/invites";
import { portalLoginPath } from "@/lib/login-paths";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";

export function AcceptTeacherInviteForm({
  token,
  schoolName,
  schoolSlug,
  presetEmail,
}: {
  token: string;
  schoolName: string;
  schoolSlug?: string;
  presetEmail?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      formData.set("token", token);
      return (await acceptTeacherInviteAction(formData)) ?? null;
    },
    null
  );

  return (
    <Card className="w-full max-w-lg rounded-2xl border-2">
      <CardHeader>
        <CardTitle>Convite de professor</CardTitle>
        <CardDescription>
          Você foi convidado para entrar em <strong>{schoolName}</strong>. Crie sua conta abaixo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <Label htmlFor="fullName">Seu nome</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={presetEmail ?? undefined}
              readOnly={!!presetEmail}
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" minLength={6} required />
          </div>
          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">
              {state.error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Criando conta..." : "Aceitar convite e entrar"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href={portalLoginPath("professor", schoolSlug)} className="text-indigo-600 hover:underline">
            Já tenho conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
