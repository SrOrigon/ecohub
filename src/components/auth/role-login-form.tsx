"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ArrowLeft, Building2, GraduationCap, Heart, UserRound } from "lucide-react";

type Portal = "escola" | "professor" | "aluno" | "responsavel";

const portalIcons = {
  escola: Building2,
  professor: GraduationCap,
  aluno: UserRound,
  responsavel: Heart,
};

const portalConfig: Record<
  Portal,
  {
    title: string;
    description: string;
    demoEmail: string;
    demoLabel: string;
    registerHref: string;
    otherPortals: { href: string; label: string }[];
  }
> = {
  escola: {
    title: "Instituição",
    description: "Acesso para direção e gestão escolar",
    demoEmail: "admin@eduhub.local",
    demoLabel: "Entrar como diretor (demo)",
    registerHref: "/registro/escola",
    otherPortals: [
      { href: "/login/professor", label: "Sou professor" },
      { href: "/login/aluno", label: "Sou aluno" },
    ],
  },
  professor: {
    title: "Professor",
    description: "Publique tarefas e gerencie suas turmas",
    demoEmail: "professor@eduhub.local",
    demoLabel: "Entrar como professor (demo)",
    registerHref: "/registro/professor",
    otherPortals: [
      { href: "/login/escola", label: "Sou instituição" },
      { href: "/login/aluno", label: "Sou aluno" },
    ],
  },
  aluno: {
    title: "Aluno",
    description: "Faça exercícios, missões e acompanhe seu progresso",
    demoEmail: "lucas@aluno.local",
    demoLabel: "Entrar como aluno (demo)",
    registerHref: "/registro/aluno",
    otherPortals: [
      { href: "/login/professor", label: "Sou professor" },
      { href: "/login/responsavel", label: "Sou responsável" },
      { href: "/login/escola", label: "Sou instituição" },
    ],
  },
  responsavel: {
    title: "Responsável",
    description: "Acompanhe filhos, notas e crie tarefas de casa",
    demoEmail: "mariana@responsavel.local",
    demoLabel: "Entrar como responsável (demo)",
    registerHref: "/registro/responsavel",
    otherPortals: [
      { href: "/login/aluno", label: "Sou aluno" },
      { href: "/login/professor", label: "Sou professor" },
      { href: "/login/escola", label: "Sou instituição" },
    ],
  },
};

export function RoleLoginForm({
  portal,
  defaultEmail,
  defaultRememberEmail = false,
  tenantSlug,
}: {
  portal: Portal;
  defaultEmail?: string;
  defaultRememberEmail?: boolean;
  tenantSlug?: string;
}) {
  const cfg = portalConfig[portal];
  const Icon = portalIcons[portal];

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      formData.set("portal", portal);
      return (await loginAction(formData)) ?? null;
    },
    null
  );

  return (
    <div className="relative w-full max-w-lg">
      <div className="absolute -top-12 right-0 sm:-top-14">
        <ThemeToggle compact />
      </div>
      <Card className="w-full rounded-2xl border-2 shadow-[var(--shadow-md)]">
      <CardHeader>
        <Link
          href="/login"
          className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[color:var(--school-primary)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950">
            <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-xl">{cfg.title}</CardTitle>
            <CardDescription>{cfg.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4" aria-label={`Login ${cfg.title}`}>
          {tenantSlug && <input type="hidden" name="tenantSlug" value={tenantSlug} />}
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={defaultEmail}
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <input
              type="checkbox"
              name="rememberMe"
              value="true"
              defaultChecked={defaultRememberEmail}
              className="rounded"
            />
            Manter conectado por 30 dias
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <input
              type="checkbox"
              name="rememberEmail"
              value="true"
              defaultChecked={defaultRememberEmail}
              className="rounded"
            />
            Lembrar meu e-mail neste dispositivo
          </label>
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

        <div className="mt-5 space-y-2">
          <p className="text-sm font-medium text-[var(--foreground)]">Demo rápido:</p>
          <form action={formAction}>
            <input type="hidden" name="portal" value={portal} />
            <input type="hidden" name="email" value={cfg.demoEmail} />
            <input type="hidden" name="password" value="demo123" />
            <Button type="submit" variant="outline" className="w-full" disabled={pending}>
              {cfg.demoLabel}
            </Button>
          </form>
          <p className="text-xs text-[var(--muted-foreground)]">Senha demo: demo123</p>
        </div>

        {portal === "aluno" && (
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            Menor de idade ou sem e-mail?{" "}
            <Link
              href={tenantSlug ? `/e/${tenantSlug}/entrar` : "/entrar"}
              className="font-semibold text-indigo-700 hover:underline dark:text-indigo-400"
            >
              Entrar com matrícula e PIN
            </Link>
            {" · "}
            É pai, mãe ou responsável?{" "}
            <Link href={tenantSlug ? `/e/${tenantSlug}/login/responsavel` : "/login/responsavel"} className="font-semibold text-rose-700 hover:underline dark:text-rose-400">
              Portal de responsáveis
            </Link>
          </p>
        )}

        {portal === "professor" && (
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            Cadastro apenas por convite. Peça um link ao diretor da escola.
          </p>
        )}

        <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
          {portal !== "professor" && (
            <>
              Não tem conta?{" "}
              <Link
                href={
                  tenantSlug && portal !== "escola"
                    ? `/registro/${portal === "aluno" ? "aluno" : portal === "responsavel" ? "responsavel" : portal}?escola=${tenantSlug}`
                    : cfg.registerHref
                }
                className="font-semibold text-[color:var(--school-primary)] hover:underline"
              >
                Cadastre-se
              </Link>
            </>
          )}
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-3 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--muted-foreground)]">
          {cfg.otherPortals.map((o) => (
            <Link key={o.href} href={o.href} className="hover:text-[color:var(--school-primary)] hover:underline">
              {o.label}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
