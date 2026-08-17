"use client";

import { useActionState } from "react";
import Link from "next/link";
import { studentPinLoginAction } from "@/actions/auth";
import { runServerAction } from "@/lib/run-server-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { ArrowLeft, KeyRound } from "lucide-react";
import { AUTH_BACK_LINK_CLASS, AUTH_CARD_CLASS, AUTH_ICON_WRAP_CLASS } from "@/components/auth/auth-shell";

export function StudentPinLoginForm({
  schoolSlug = "",
  schoolName,
  backHref = "/login",
  emailLoginHref = "/login/aluno",
}: {
  schoolSlug?: string;
  schoolName?: string | null;
  backHref?: string;
  emailLoginHref?: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) =>
      runServerAction(async () => (await studentPinLoginAction(formData)) ?? null),
    null
  );

  return (
    <Card className={AUTH_CARD_CLASS}>
      <CardHeader>
        <Link href={backHref} className={AUTH_BACK_LINK_CLASS}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </Link>
        <div className="flex items-center gap-3">
          <div className={AUTH_ICON_WRAP_CLASS}>
            <KeyRound className="h-6 w-6 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
          </div>
            <div>
              <CardTitle className="text-xl">Entrar com matrícula e PIN</CardTitle>
              <CardDescription>
                {schoolName
                  ? `Acesso rápido  -  ${schoolName}`
                  : "Para alunos menores ou contas liberadas pela escola"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="schoolSlug">Código da escola</Label>
              <Input
                id="schoolSlug"
                name="schoolSlug"
                required
                placeholder="ex.: minha-escola"
                defaultValue={schoolSlug}
                readOnly={!!schoolSlug}
              />
            </div>
            <div>
              <Label htmlFor="enrollmentCode">Matrícula</Label>
              <Input id="enrollmentCode" name="enrollmentCode" required placeholder="Número de matrícula" />
            </div>
            <div>
              <Label htmlFor="pin">PIN (6 dígitos)</Label>
              <Input
                id="pin"
                name="pin"
                type="password"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                placeholder="••••••"
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
              {pending ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
            Tem e-mail e senha?{" "}
            <Link href={emailLoginHref} className="font-semibold text-[color:var(--school-primary)] hover:underline">
              Login com e-mail
            </Link>
          </p>
        </CardContent>
    </Card>
  );
}
