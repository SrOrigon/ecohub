import Link from "next/link";
import {
  BarChart3,
  GraduationCap,
  Medal,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const features = [
  {
    icon: GraduationCap,
    title: "Gestão Acadêmica",
    description: "Escolas, turmas, alunos, notas e frequência — inspirado no Sponte Educacional.",
  },
  {
    icon: Target,
    title: "Gamificação",
    description: "Missões, XP, moedas, badges e rankings para engajar alunos como no Gamefik.",
  },
  {
    icon: BarChart3,
    title: "Dashboards",
    description: "Gráficos de desempenho, comparativos por turma e relatórios para diretores.",
  },
  {
    icon: Users,
    title: "Multi-perfil",
    description: "Diretor, professor, aluno e responsável com visões personalizadas.",
  },
  {
    icon: Zap,
    title: "Notificações",
    description: "Alertas automáticos sobre notas, missões, resgates na loja e novidades da escola.",
  },
  {
    icon: Medal,
    title: "100% Gratuito",
    description: "Roda localmente com SQLite — zero configuração. Pronto para deploy quando quiser.",
  },
];

const portalLinks = [
  {
    href: "/login/professor",
    title: "Professor",
    description: "Cadastre turmas e publique tarefas manualmente",
    color:
      "border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:border-emerald-600",
  },
  {
    href: "/login/aluno",
    title: "Aluno",
    description: "Faça exercícios, missões e acompanhe seu progresso",
    color:
      "border-amber-200 bg-amber-50/50 hover:border-amber-400 dark:border-amber-800 dark:bg-amber-950/30 dark:hover:border-amber-600",
  },
  {
    href: "/login/escola",
    title: "Instituição",
    description: "Gestão, relatórios e código para vincular a escola",
    color:
      "border-indigo-200 bg-indigo-50/50 hover:border-indigo-400 dark:border-indigo-800 dark:bg-indigo-950/30 dark:hover:border-indigo-600",
  },
];

export default function HomePage() {
  return (
    <div className="landing-page">
      <header className="landing-header sticky top-0 z-20 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-b px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex min-w-0 items-center gap-2">
          <Medal className="h-8 w-8 shrink-0 text-[color:var(--school-primary)]" aria-hidden="true" />
          <span className="truncate text-xl font-bold text-[var(--foreground)]">EduHub</span>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <ThemeToggle compact className="sm:mr-1" />
          <Link href="/login" className="flex-1 sm:flex-none">
            <Button variant="ghost" className="w-full sm:w-auto">
              Entrar
            </Button>
          </Link>
          <Link href="/registro/escola" className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto">Criar escola</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-12">
        <section className="text-center">
          <p className="mb-4 inline-block rounded-full bg-indigo-100 px-4 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
            Plataforma educacional open source
          </p>
          <h1 className="page-title mx-auto max-w-3xl">
            Gestão escolar + gamificação em um só lugar
          </h1>
          <p className="page-subtitle mx-auto mt-4 max-w-2xl sm:mt-6">
            Unindo a robustez administrativa do Sponte com o engajamento do Gamefik.
            Desenvolvido para escolas e cursos com orçamento zero.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link href="/registro/escola" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Registrar instituição
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Entrar
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {portalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-2xl border-2 p-6 text-center transition ${link.color}`}
            >
              <h2 className="text-lg font-bold text-[var(--foreground)]">{link.title}</h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{link.description}</p>
            </Link>
          ))}
        </section>

        <section className="responsive-grid mt-12 sm:mt-16">
          {features.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="min-w-0 border-indigo-100 dark:border-indigo-900/50"
            >
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950">
                  <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </section>

        <section className="mt-12 rounded-2xl bg-indigo-600 px-4 py-10 text-center text-white shadow-[var(--shadow-md)] sm:mt-20 sm:px-8 sm:py-12 dark:bg-indigo-700">
          <h2 className="text-xl font-bold sm:text-2xl">Pronto para começar?</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">
            Sistema completo: cadastros, notas, frequência, gamificação e relatórios.
            Pronto para escolas e cursos.
          </p>
          <Link href="/login" className="mt-6 inline-block w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Entrar no sistema
            </Button>
          </Link>
        </section>
      </main>
    </div>
  );
}
