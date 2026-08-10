import Link from "next/link";
import { Building2, GraduationCap, Heart, KeyRound, UserRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Medal } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const portals = [
  {
    href: "/login/escola",
    registerHref: "/registro/escola",
    icon: Building2,
    title: "Instituição",
    description: "Direção e gestão da escola — turmas, relatórios e configurações.",
    color:
      "border-indigo-200 bg-indigo-50/50 hover:border-indigo-400 dark:border-indigo-800 dark:bg-indigo-950/30 dark:hover:border-indigo-600",
    iconColor: "text-indigo-600 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-950",
  },
  {
    href: "/login/professor",
    registerHref: "/registro/professor",
    icon: GraduationCap,
    title: "Professor",
    description: "Cadastre turmas, publique exercícios e acompanhe entregas.",
    color:
      "border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:border-emerald-600",
    iconColor: "text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950",
  },
  {
    href: "/login/aluno",
    registerHref: "/registro/aluno",
    icon: UserRound,
    title: "Aluno",
    description: "Exercícios escolares, missões e tarefas de casa da família.",
    color:
      "border-amber-200 bg-amber-50/50 hover:border-amber-400 dark:border-amber-800 dark:bg-amber-950/30 dark:hover:border-amber-600",
    iconColor: "text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-950",
  },
  {
    href: "/login/responsavel",
    registerHref: "/registro/responsavel",
    icon: Heart,
    title: "Responsável",
    description: "Veja desempenho dos filhos e crie tarefas de casa com recompensas.",
    color:
      "border-rose-200 bg-rose-50/50 hover:border-rose-400 dark:border-rose-800 dark:bg-rose-950/30 dark:hover:border-rose-600",
    iconColor: "text-rose-600 bg-rose-100 dark:text-rose-300 dark:bg-rose-950",
  },
];

export function AuthPortalPicker({ mode }: { mode: "login" | "register" }) {
  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex justify-end">
        <ThemeToggle compact />
      </div>
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950">
          <Medal className="h-7 w-7 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {mode === "login" ? "Entrar no EduHub" : "Criar conta no EduHub"}
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">Escolha seu tipo de acesso</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {portals.map((p) => {
          const Icon = p.icon;
          const href = mode === "login" ? p.href : p.registerHref;
          return (
            <Link key={p.href} href={href} className="block min-h-11">
              <Card className={`h-full border-2 transition-colors ${p.color}`}>
                <CardHeader className="pb-2 text-center">
                  <div
                    className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${p.iconColor}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{p.title}</CardTitle>
                  <CardDescription className="text-sm">{p.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-4 text-center">
                  <span className="text-sm font-semibold text-[color:var(--school-primary,#4f46e5)]">
                    {mode === "login" ? "Entrar →" : "Cadastrar →"}
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {mode === "login" && (
        <div className="mx-auto max-w-md">
          <Link
            href="/entrar"
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 px-4 py-3 text-sm font-semibold text-indigo-800 transition hover:border-indigo-400 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Aluno — entrar com matrícula e PIN
          </Link>
        </div>
      )}

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {mode === "login" ? (
          <>
            Não tem conta?{" "}
            <Link
              href="/registro"
              className="font-semibold text-[color:var(--school-primary)] hover:underline"
            >
              Cadastre-se
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link
              href="/login"
              className="font-semibold text-[color:var(--school-primary)] hover:underline"
            >
              Entrar
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
