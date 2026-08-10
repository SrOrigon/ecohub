"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerTeacherAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { ArrowLeft } from "lucide-react";

export default function RegisterProfessorPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await registerTeacherAction(formData)) ?? null;
    },
    null
  );

  return (
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg rounded-2xl border-2">
        <CardHeader>
          <Link href="/registro" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Link>
          <CardTitle>Cadastro de professor</CardTitle>
          <CardDescription>
            Entre na escola com o código fornecido pela instituição. Demo: <strong>escola-demo</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="schoolSlug">Código da escola</Label>
              <Input id="schoolSlug" name="schoolSlug" required placeholder="escola-demo" />
            </div>
            <div>
              <Label htmlFor="fullName">Seu nome</Label>
              <Input id="fullName" name="fullName" required />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" minLength={6} required />
            </div>
            {state?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Criando..." : "Criar conta de professor"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link href="/login/professor" className="text-indigo-600 hover:underline">
              Já tenho conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
