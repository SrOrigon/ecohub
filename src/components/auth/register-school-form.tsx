"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { registerSchoolAction, type RegisterSchoolResult } from "@/actions/auth";
import { RegisterSchoolSuccess } from "@/components/auth/register-school-success";
import { runServerAction } from "@/lib/run-server-action";
import { lookupCnpjAction } from "@/actions/cnpj";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { formatCnpj, normalizeCnpj } from "@/lib/cnpj";
import {
  SCHOOL_VERIFICATION_LABELS,
  hasEducationCnae,
  verificationStatusMessage,
  type SchoolVerificationStatus,
} from "@/lib/school-verification";
import { ArrowLeft, Building2, CheckCircle2, Loader2, Search } from "lucide-react";

type CnpjPreview = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacao: string;
  cnae: string;
  cnaeDescricao: string | null;
  city: string | null;
  state: string | null;
  verificationStatus: SchoolVerificationStatus;
};

function statusBadgeVariant(status: SchoolVerificationStatus) {
  if (status === "verified") return "success" as const;
  if (status === "manual_review") return "warning" as const;
  if (status === "rejected") return "danger" as const;
  return "secondary" as const;
}

export function RegisterSchoolForm() {
  const [cnpjInput, setCnpjInput] = useState("");
  const [preview, setPreview] = useState<CnpjPreview | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, startLookup] = useTransition();

  const [state, formAction, pending] = useActionState(
    async (_prev: RegisterSchoolResult, formData: FormData) =>
      runServerAction(async () => (await registerSchoolAction(formData)) ?? null),
    null
  );

  if (state?.success) {
    return <RegisterSchoolSuccess result={state} />;
  }

  function handleLookup() {
    setLookupError(null);
    setPreview(null);
    startLookup(async () => {
      const fd = new FormData();
      fd.set("cnpj", cnpjInput);
      const result = await lookupCnpjAction(fd);
      if ("error" in result) {
        setLookupError(result.error ?? "Erro ao consultar CNPJ.");
        return;
      }
      setPreview(result);
    });
  }

  const canSubmit = preview && preview.verificationStatus !== "rejected";

  return (
    <div className="relative w-full max-w-lg">
      <div className="absolute -top-12 right-0 sm:-top-14">
        <ThemeToggle compact />
      </div>
      <Card className="w-full rounded-2xl border-2 shadow-[var(--shadow-md)]">
        <CardHeader>
          <Link
            href="/registro"
            className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[color:var(--school-primary)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950">
              <Building2 className="h-6 w-6 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Registrar instituição</CardTitle>
              <CardDescription>
                Validamos o CNPJ na Receita Federal para garantir que é uma escola ou curso real.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="cnpj">CNPJ da instituição</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="cnpj"
                  name="cnpj"
                  required
                  placeholder="00.000.000/0001-00"
                  value={cnpjInput}
                  onChange={(e) => {
                    setCnpjInput(e.target.value);
                    setPreview(null);
                    setLookupError(null);
                  }}
                  className="min-w-[12rem] flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleLookup}
                  disabled={isLookingUp || normalizeCnpj(cnpjInput).length < 14}
                  className="gap-2"
                >
                  {isLookingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Search className="h-4 w-4" aria-hidden="true" />
                  )}
                  Validar
                </Button>
              </div>
              {lookupError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {lookupError}
                </p>
              )}
            </div>

            {preview && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--hover)] p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{preview.razaoSocial}</p>
                    {preview.nomeFantasia && (
                      <p className="text-[var(--muted-foreground)]">Fantasia: {preview.nomeFantasia}</p>
                    )}
                    <p className="mt-1 font-mono text-xs">{formatCnpj(preview.cnpj)}</p>
                    {preview.city && preview.state && (
                      <p className="mt-1 text-[var(--muted-foreground)]">
                        {preview.city}  -  {preview.state}
                      </p>
                    )}
                    {preview.cnaeDescricao && (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{preview.cnaeDescricao}</p>
                    )}
                  </div>
                  <Badge variant={statusBadgeVariant(preview.verificationStatus)}>
                    {SCHOOL_VERIFICATION_LABELS[preview.verificationStatus]}
                  </Badge>
                </div>
                <p className="mt-3 text-[var(--muted-foreground)]">
                  {verificationStatusMessage(preview.verificationStatus)}
                </p>
                {preview.verificationStatus === "verified" && (
                  <p className="mt-2 flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Pronto para cadastro
                  </p>
                )}
                {preview.verificationStatus === "verified" && !hasEducationCnae(preview.cnae) && (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    CNAE principal fora do grupo de ensino - cadastro liberado com CNPJ ativo na Receita
                    Federal.
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="schoolName">Nome de exibição no Ecohub</Label>
              <Input
                id="schoolName"
                name="schoolName"
                required
                placeholder="Como a escola aparecerá no sistema"
                defaultValue={preview?.nomeFantasia ?? preview?.razaoSocial ?? ""}
                key={preview?.cnpj ?? "empty"}
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Pode ser o nome fantasia ou abreviação - a razão social vem do CNPJ.
              </p>
            </div>
            <div>
              <Label htmlFor="fullName">Seu nome (direção)</Label>
              <Input id="fullName" name="fullName" required autoComplete="name" />
            </div>
            <div>
              <Label htmlFor="email">E-mail institucional</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>

            {state && "error" in state && state.error && (
              <p
                className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:bg-red-950/50 dark:text-red-200"
                role="alert"
              >
                {state.error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={pending || !canSubmit}>
              {pending ? "Criando instituição..." : "Criar conta da instituição"}
            </Button>
            {!preview && (
              <p className="text-center text-xs text-[var(--muted-foreground)]">
                Valide o CNPJ antes de continuar.
              </p>
            )}
          </form>

          <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
            Já tem conta?{" "}
            <Link href="/login/escola" className="font-semibold text-[color:var(--school-primary)] hover:underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
