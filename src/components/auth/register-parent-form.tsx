"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerParentAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { ArrowLeft } from "lucide-react";

export function RegisterParentForm({ initialSchoolSlug = "" }: { initialSchoolSlug?: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await registerParentAction(formData)) ?? null;
    },
    null
  );

  return (
    <Card className="w-full max-w-lg rounded-2xl border-2 border-rose-200">
      <CardHeader>
        <Link href="/registro" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </Link>
        <CardTitle>Cadastro de responsável</CardTitle>
        <CardDescription>
          Acompanhe o desempenho dos filhos e crie tarefas de casa com recompensas.
          Demo: escola <strong>escola-demo</strong>, matrícula <strong>2026001</strong> (Lucas).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="schoolSlug">Código da escola</Label>
            <Input
              id="schoolSlug"
              name="schoolSlug"
              required
              placeholder="escola-demo"
              defaultValue={initialSchoolSlug}
            />
          </div>
          <div>
            <Label htmlFor="enrollmentCode">Matrícula do filho(a)</Label>
            <Input id="enrollmentCode" name="enrollmentCode" required placeholder="Ex.: 2026001" />
            <p className="mt-1 text-xs text-slate-500">Peça a matrícula na escola ou no boletim do aluno.</p>
          </div>
          <div>
            <Label htmlFor="relation">Vínculo</Label>
            <Select id="relation" name="relation" defaultValue="responsavel">
              <option value="mae">Mãe</option>
              <option value="pai">Pai</option>
              <option value="responsavel">Responsável</option>
              <option value="avo">Avô/Avó</option>
            </Select>
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
            {pending ? "Criando..." : "Criar conta de responsável"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/login/responsavel" className="text-indigo-600 hover:underline">
            Já tenho conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
