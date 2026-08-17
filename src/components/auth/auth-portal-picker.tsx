import Link from "next/link";
import { Building2, GraduationCap, Heart, KeyRound, UserRound } from "lucide-react";
import { portalLoginPath, registerPathForPortal } from "@/lib/login-paths";
import { tenantEntrarPath } from "@/lib/tenant";
import { AUTH_ICON_WRAP_CLASS } from "@/components/auth/auth-shell";
import type { LoginPortal } from "@/lib/preference-cookies";

const TILE_CLASS =
  "flex h-full min-h-11 flex-col rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-[var(--shadow-sm)] transition hover:border-[color:var(--school-primary)] hover:shadow-[var(--shadow-md)]";

const PORTALS: { portal: LoginPortal; title: string; description: string; icon: typeof Building2 }[] = [
  {
    portal: "escola",
    title: "Instituição",
    description: "Direção, secretaria e gestão da escola.",
    icon: Building2,
  },
  {
    portal: "professor",
    title: "Professor",
    description: "Turmas, exercícios e acompanhamento.",
    icon: GraduationCap,
  },
  {
    portal: "aluno",
    title: "Aluno",
    description: "Missões, exercícios e progresso.",
    icon: UserRound,
  },
  {
    portal: "responsavel",
    title: "Responsável",
    description: "Acompanhe filhos e tarefas de casa.",
    icon: Heart,
  },
];

export function AuthPortalPicker({
  mode,
  tenantSlug,
  schoolName,
}: {
  mode: "login" | "register";
  tenantSlug?: string;
  schoolName?: string;
}) {
  const items = [
    ...PORTALS.map((p) => ({
      href: mode === "login" ? portalLoginPath(p.portal, tenantSlug) : registerPathForPortal(p.portal, tenantSlug),
      icon: p.icon,
      title: p.title,
      description: p.description,
    })),
    ...(mode === "login"
      ? [
          {
            href: tenantSlug ? tenantEntrarPath(tenantSlug) : "/entrar",
            icon: KeyRound,
            title: "Aluno (PIN)",
            description: "Entrada rápida com matrícula e PIN.",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {mode === "login" ? "Entrar no Ecohub" : "Criar conta no Ecohub"}
        </h1>
        {schoolName ? (
          <p className="mt-2 text-[var(--muted-foreground)]">
            {schoolName}
            {tenantSlug ? (
              <>
                {" "}
                · <span className="font-mono text-sm">{tenantSlug}</span>
              </>
            ) : null}
          </p>
        ) : (
          <p className="mt-2 text-[var(--muted-foreground)]">Escolha o tipo de acesso</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((p) => {
          const Icon = p.icon;
          return (
            <Link key={p.href} href={p.href} className={TILE_CLASS}>
              <div className={`${AUTH_ICON_WRAP_CLASS} mb-3 h-10 w-10`}>
                <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
              </div>
              <p className="font-semibold text-[var(--foreground)]">{p.title}</p>
              <p className="mt-1 text-sm leading-snug text-[var(--muted-foreground)]">{p.description}</p>
            </Link>
          );
        })}
      </div>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {mode === "login" ? (
          <>
            Não tem conta?{" "}
            <Link href="/registro" className="font-semibold text-[color:var(--school-primary)] hover:underline">
              Cadastre-se
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-[color:var(--school-primary)] hover:underline">
              Entrar
            </Link>
          </>
        )}
        {tenantSlug ? (
          <>
            {" · "}
            <Link href="/login" className="font-semibold text-[color:var(--school-primary)] hover:underline">
              Outra escola
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
