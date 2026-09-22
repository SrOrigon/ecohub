"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { formatWhatsAppMask } from "@/lib/whatsapp-billing";
import { registerParentAction } from "@/actions/auth";
import { runServerAction } from "@/lib/run-server-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";
import { AUTH_BACK_LINK_CLASS, AUTH_CARD_CLASS } from "@/components/auth/auth-shell";
import { ArrowLeft } from "lucide-react";

export function RegisterParentForm({ initialSchoolSlug = "" }: { initialSchoolSlug?: string }) {
  const [phone, setPhone] = useState("");
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) =>
      runServerAction(async () => (await registerParentAction(formData)) ?? null),
    null
  );

  return (
    <Card className={AUTH_CARD_CLASS}>
      <CardHeader>
        <Link href="/registro" className={AUTH_BACK_LINK_CLASS}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </Link>
        <CardTitle>Cadastro de responsável</CardTitle>
        <CardDescription>
          Acompanhe o desempenho dos filhos e crie tarefas de casa com recompensas.
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
              placeholder="codigo-da-escola"
              defaultValue={initialSchoolSlug}
            />
          </div>
          <div>
            <Label htmlFor="enrollmentCode">Matrícula do filho(a)</Label>
            <Input id="enrollmentCode" name="enrollmentCode" required placeholder="Matrícula do aluno" />
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
            <Label htmlFor="phone">Telemóvel / WhatsApp (com DDD)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(formatWhatsAppMask(e.target.value))}
            />
            <p className="mt-1 text-xs text-slate-500">
              Necessário para receber informes da escola e notificações financeiras.
            </p>
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
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
