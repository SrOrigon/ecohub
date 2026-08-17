"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { runServerAction } from "@/lib/run-server-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { loginHubPath, portalLoginPath, registerPathForPortal } from "@/lib/login-paths";
import { tenantEntrarPath } from "@/lib/tenant";
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
    otherPortals: { portal: Portal; label: string }[];
  }
> = {
  escola: {
    title: "Instituição",
    description: "Acesso para direção e gestão escolar",
    otherPortals: [
      { portal: "professor", label: "Sou professor" },
      { portal: "aluno", label: "Sou aluno" },
    ],
  },
  professor: {
    title: "Professor",
    description: "Publique tarefas e gerencie suas turmas",
    otherPortals: [
      { portal: "escola", label: "Sou instituição" },
      { portal: "aluno", label: "Sou aluno" },
    ],
  },
  aluno: {
    title: "Aluno",
    description: "Faça exercícios, missões e acompanhe seu progresso",
    otherPortals: [
      { portal: "professor", label: "Sou professor" },
      { portal: "responsavel", label: "Sou responsável" },
      { portal: "escola", label: "Sou instituição" },
    ],
  },
  responsavel: {
    title: "Responsável",
    description: "Acompanhe filhos, notas e crie tarefas de casa",
    otherPortals: [
      { portal: "aluno", label: "Sou aluno" },
      { portal: "professor", label: "Sou professor" },
      { portal: "escola", label: "Sou instituição" },
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
  const backHref = loginHubPath(tenantSlug);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      formData.set("portal", portal);
      return runServerAction(async () => (await loginAction(formData)) ?? null);
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
          href={backHref}
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
              autoComplete="username"
              defaultValue={defaultEmail}
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {portal === "escola" && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 text-sm text-slate-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-slate-100">Acesso da instituição</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                <li>Use o <strong>mesmo e-mail e senha</strong> do cadastro em &quot;Registrar instituição&quot;.</li>
                <li>A senha precisa ter <strong>letras e números</strong> (mín. 8 caracteres).</li>
                <li>Professores e alunos também podem entrar por aqui com o e-mail da conta — o sistema abre o painel certo.</li>
                <li>Prefira <strong>/login/escola</strong> se o link da escola não funcionar.</li>
              </ul>
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <input
              type="checkbox"
              name="rememberMe"
              value="true"
              defaultChecked={false}
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

        {portal === "aluno" && (
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            Menor de idade ou sem e-mail?{" "}
            <Link
              href={tenantSlug ? tenantEntrarPath(tenantSlug) : "/entrar"}
              className="font-semibold text-indigo-700 hover:underline dark:text-indigo-400"
            >
              Entrar com matrícula e PIN
            </Link>
            {" · "}
            É pai, mãe ou responsável?{" "}
            <Link
              href={portalLoginPath("responsavel", tenantSlug)}
              className="font-semibold text-rose-700 hover:underline dark:text-rose-400"
            >
              Portal de responsáveis
            </Link>
          </p>
        )}

        {portal === "professor" && (
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            Use o e-mail e a senha criados pela instituição em Professores. Convite também funciona.
          </p>
        )}

        <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
          {portal !== "professor" && portal !== "escola" && (
            <>
              Não tem conta?{" "}
              <Link
                href={registerPathForPortal(portal, tenantSlug)}
                className="font-semibold text-[color:var(--school-primary)] hover:underline"
              >
                Cadastre-se
              </Link>
            </>
          )}
          {portal === "escola" && (
            <>
              Não tem conta?{" "}
              <Link href="/registro/escola" className="font-semibold text-[color:var(--school-primary)] hover:underline">
                Cadastre sua instituição
              </Link>
            </>
          )}
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-3 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--muted-foreground)]">
          {cfg.otherPortals.map((o) => (
            <Link
              key={o.portal}
              href={portalLoginPath(o.portal, tenantSlug)}
              className="hover:text-[color:var(--school-primary)] hover:underline"
            >
              {o.label}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
