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

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex min-w-0 items-center gap-2">
          <Medal className="h-8 w-8 shrink-0 text-indigo-600" aria-hidden="true" />
          <span className="truncate text-xl font-bold">EduHub</span>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
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
          <p className="mb-4 inline-block rounded-full bg-indigo-100 px-4 py-1 text-sm font-medium text-indigo-700">
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
          <Link href="/login/professor" className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-6 text-center transition hover:border-emerald-400">
            <h2 className="text-lg font-bold text-slate-900">Professor</h2>
            <p className="mt-2 text-sm text-slate-600">Cadastre turmas e publique tarefas manualmente</p>
          </Link>
          <Link href="/login/aluno" className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-6 text-center transition hover:border-amber-400">
            <h2 className="text-lg font-bold text-slate-900">Aluno</h2>
            <p className="mt-2 text-sm text-slate-600">Faça exercícios, missões e acompanhe seu progresso</p>
          </Link>
          <Link href="/login/escola" className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-6 text-center transition hover:border-indigo-400">
            <h2 className="text-lg font-bold text-slate-900">Instituição</h2>
            <p className="mt-2 text-sm text-slate-600">Gestão, relatórios e código para vincular a escola</p>
          </Link>
        </section>

        <section className="responsive-grid mt-12 sm:mt-16">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="min-w-0 border-indigo-100">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                  <Icon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </section>

        <section className="mt-12 rounded-2xl bg-indigo-600 px-4 py-10 text-center text-white sm:mt-20 sm:px-8 sm:py-12">
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
