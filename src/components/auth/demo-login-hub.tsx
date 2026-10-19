"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Building2, GraduationCap, Sparkles, UserRound, ArrowLeft } from "lucide-react";
import { demoLoginAction } from "@/actions/auth";
import { runServerAction } from "@/lib/run-server-action";
import { Button } from "@/components/ui/button";
import { AUTH_BACK_LINK_CLASS, AUTH_ICON_WRAP_CLASS } from "@/components/auth/auth-shell";
import { DEMO_SCHOOL_NAME, type DemoPortal } from "@/lib/demo-accounts";

const TILE_CLASS =
  "flex h-full min-h-11 w-full flex-col rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-[var(--shadow-sm)] transition hover:border-[color:var(--school-primary)] hover:shadow-[var(--shadow-md)]";

const PORTALS: {
  portal: DemoPortal;
  icon: typeof Building2;
  title: string;
  description: string;
}[] = [
  {
    portal: "escola",
    icon: Building2,
    title: "Instituição",
    description: "Direção, relatórios, turmas e visão geral da escola.",
  },
  {
    portal: "professor",
    icon: GraduationCap,
    title: "Professor",
    description: "Turmas, exercícios, correções e acompanhamento.",
  },
  {
    portal: "aluno",
    icon: UserRound,
    title: "Aluno",
    description: "Missões, exercícios com animações, XP e loja.",
  },
];

export function DemoLoginHub() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) =>
      runServerAction(async () => (await demoLoginAction(formData)) ?? null),
    null
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Link href="/login" className={AUTH_BACK_LINK_CLASS}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar ao login
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1 text-sm font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Acesso demo
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Demonstração do Ecohub</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">{DEMO_SCHOOL_NAME}</p>
        <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--muted-foreground)]">
          Toque no perfil desejado — a entrada é automática, sem e-mail nem senha.
        </p>
      </div>

      {state?.error && (
        <p
          className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-800 dark:bg-red-950/50 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PORTALS.map((p) => {
          const Icon = p.icon;
          return (
            <form key={p.portal} action={formAction} className="contents">
              <input type="hidden" name="portal" value={p.portal} />
              <button
                type="submit"
                disabled={pending}
                className={`${TILE_CLASS} disabled:opacity-60`}
                aria-label={`Entrar na demonstração como ${p.title}`}
              >
                <div className={`${AUTH_ICON_WRAP_CLASS} mb-3 h-10 w-10`}>
                  <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
                </div>
                <p className="font-semibold text-[var(--foreground)]">
                  {pending ? "Abrindo…" : p.title}
                </p>
                <p className="mt-1 text-sm leading-snug text-[var(--muted-foreground)]">{p.description}</p>
                <span className="mt-4 inline-flex text-sm font-semibold text-[color:var(--school-primary)]">
                  Entrar →
                </span>
              </button>
            </form>
          );
        })}
      </div>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        <Link href="/login" className="font-semibold text-[color:var(--school-primary)] hover:underline">
          Voltar ao login com conta real
        </Link>
      </p>
    </div>
  );
}
