"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { runServerAction } from "@/lib/run-server-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-fields";
import { AUTH_BACK_LINK_CLASS, AUTH_CARD_CLASS, AUTH_ICON_WRAP_CLASS } from "@/components/auth/auth-shell";
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
      { portal: "professor", label: "Professor" },
      { portal: "aluno", label: "Aluno" },
      { portal: "responsavel", label: "Responsável" },
    ],
  },
  professor: {
    title: "Professor",
    description: "Turmas, tarefas e acompanhamento",
    otherPortals: [
      { portal: "escola", label: "Instituição" },
      { portal: "aluno", label: "Aluno" },
      { portal: "responsavel", label: "Responsável" },
    ],
  },
  aluno: {
    title: "Aluno",
    description: "Exercícios, missões e progresso",
    otherPortals: [
      { portal: "escola", label: "Instituição" },
      { portal: "professor", label: "Professor" },
      { portal: "responsavel", label: "Responsável" },
    ],
  },
  responsavel: {
    title: "Responsável",
    description: "Acompanhe filhos, notas e tarefas de casa",
    otherPortals: [
      { portal: "escola", label: "Instituição" },
      { portal: "professor", label: "Professor" },
      { portal: "aluno", label: "Aluno" },
    ],
  },
};

export function RoleLoginForm({
  portal,
  defaultEmail,
  defaultRememberEmail = false,
  tenantSlug,
  schoolName,
}: {
  portal: Portal;
  defaultEmail?: string;
  defaultRememberEmail?: boolean;
  tenantSlug?: string;
  schoolName?: string;
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
    <Card className={AUTH_CARD_CLASS}>
      <CardHeader>
        <Link href={backHref} className={AUTH_BACK_LINK_CLASS}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </Link>
        <div className="flex items-center gap-3">
          <div className={AUTH_ICON_WRAP_CLASS}>
            <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-xl">{cfg.title}</CardTitle>
            <CardDescription>
              {schoolName ? `${schoolName} · ${cfg.description}` : cfg.description}
            </CardDescription>
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
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <input type="checkbox" name="rememberMe" value="true" className="rounded" />
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
          <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
            Sem e-mail?{" "}
            <Link
              href={tenantSlug ? tenantEntrarPath(tenantSlug) : "/entrar"}
              className="font-semibold text-[color:var(--school-primary)] hover:underline"
            >
              Entrar com matrícula e PIN
            </Link>
          </p>
        )}

        <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
          {portal === "professor" ? (
            "Use o e-mail e a senha criados pela instituição, ou um convite."
          ) : (
            <>
              Não tem conta?{" "}
              <Link
                href={registerPathForPortal(portal, tenantSlug)}
                className="font-semibold text-[color:var(--school-primary)] hover:underline"
              >
                {portal === "escola" ? "Cadastre sua instituição" : "Cadastre-se"}
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
  );
}
