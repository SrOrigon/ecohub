"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Search,
  GraduationCap,
  Users,
  Sparkles,
  Shield,
  FileText,
  ArrowRight,
  Filter,
  CheckCircle2,
  X,
  Mail,
  Fingerprint,
} from "lucide-react";

export type SearchStudent = {
  id: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  enrollmentCode: string;
  className: string;
  level: number;
  matchReasons: string[];
};

export type SearchTeacher = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  matchReasons: string[];
};

export type SearchClass = {
  id: string;
  name: string;
  gradeLevel: string;
  year: number;
};

export type SearchMission = {
  id: string;
  title: string;
  description: string | null;
  xpReward: number;
  coinReward: number;
};

type Props = {
  initialQuery: string;
  students: SearchStudent[];
  teachers: SearchTeacher[];
  classes: SearchClass[];
  missions: SearchMission[];
};

// Componente inteligente para destacar as letras que coincidem com a busca
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;

  // Regex insensível a maiúsculas/minúsculas e acentos
  const cleanQ = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    const parts = text.split(new RegExp(`(${cleanQ})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className="rounded-xs bg-amber-200/90 px-0.5 py-0.2 font-bold text-amber-950 dark:bg-amber-500/40 dark:text-amber-200"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

export function BuscaView({
  initialQuery,
  students,
  teachers,
  classes,
  missions,
}: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<"all" | "students" | "teachers" | "classes" | "missions">("all");

  const totalResults = students.length + teachers.length + classes.length + missions.length;

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchTerm.trim();
    if (q) {
      router.push(`/dashboard/busca?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/dashboard/busca");
    }
  }

  const showStudents = (activeTab === "all" || activeTab === "students") && students.length > 0;
  const showTeachers = (activeTab === "all" || activeTab === "teachers") && teachers.length > 0;
  const showClasses = (activeTab === "all" || activeTab === "classes") && classes.length > 0;
  const showMissions = (activeTab === "all" || activeTab === "missions") && missions.length > 0;

  const currentCount = useMemo(() => {
    switch (activeTab) {
      case "students":
        return students.length;
      case "teachers":
        return teachers.length;
      case "classes":
        return classes.length;
      case "missions":
        return missions.length;
      default:
        return totalResults;
    }
  }, [activeTab, students, teachers, classes, missions, totalResults]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho dinâmico */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl">
            Resultados para &ldquo;{initialQuery}&rdquo;
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {totalResults === 1 ? "1 resultado encontrado" : `${totalResults} resultados encontrados`}
            {initialQuery && ` no sistema`}
          </p>
        </div>

        {/* Input inline de refino de busca */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Refinar pesquisa..."
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-9 text-sm text-[var(--foreground)] shadow-xs focus:border-[color:var(--school-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--school-primary-soft)]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Limpar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {/* Abas / Filtros de Categoria */}
      {totalResults > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "all"
                ? "bg-[color:var(--school-primary)] text-white shadow-xs"
                : "bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] border border-[var(--border)]"
            }`}
          >
            Todos
            <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
              activeTab === "all" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-[var(--foreground)]"
            }`}>
              {totalResults}
            </span>
          </button>

          {students.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("students")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "students"
                  ? "bg-[color:var(--school-primary)] text-white shadow-xs"
                  : "bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] border border-[var(--border)]"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Alunos
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "students" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-[var(--foreground)]"
              }`}>
                {students.length}
              </span>
            </button>
          )}

          {teachers.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("teachers")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "teachers"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] border border-[var(--border)]"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Professores
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "teachers" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-[var(--foreground)]"
              }`}>
                {teachers.length}
              </span>
            </button>
          )}

          {classes.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("classes")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "classes"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] border border-[var(--border)]"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Turmas
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "classes" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-[var(--foreground)]"
              }`}>
                {classes.length}
              </span>
            </button>
          )}

          {missions.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("missions")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "missions"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] border border-[var(--border)]"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Missões
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "missions" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-[var(--foreground)]"
              }`}>
                {missions.length}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Seção ALUNOS */}
      {showStudents && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
              <GraduationCap className="h-5 w-5 text-[color:var(--school-primary)]" />
              Alunos ({students.length})
            </h2>
            <Link
              href="/dashboard/alunos"
              className="text-xs font-medium text-[color:var(--school-primary)] hover:underline flex items-center gap-1"
            >
              Ver todos os alunos
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((s) => (
              <div
                key={s.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[color:var(--school-primary)] hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-xs">
                        {s.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/alunos/${s.id}`}
                          className="font-bold text-[var(--foreground)] hover:text-[color:var(--school-primary)] truncate block text-sm"
                        >
                          <HighlightText text={s.fullName} query={initialQuery} />
                        </Link>
                        <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                          {s.className}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px] font-bold">
                      Nv. {s.level}
                    </Badge>
                  </div>

                  {/* Informações complementares de correspondência */}
                  <div className="mt-3.5 flex flex-wrap gap-1.5 text-[11px] text-[var(--muted-foreground)]">
                    {s.enrollmentCode && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5">
                        <Fingerprint className="h-3 w-3 text-slate-500" />
                        <HighlightText text={s.enrollmentCode} query={initialQuery} />
                      </span>
                    )}
                    {s.email && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 truncate max-w-[200px]" title={s.email}>
                        <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                        <span className="truncate"><HighlightText text={s.email} query={initialQuery} /></span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações rápidas */}
                <div className="mt-4 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
                  <Link
                    href={`/dashboard/alunos/${s.id}`}
                    className="flex-1 rounded-xl bg-[var(--hover)] py-1.5 text-center text-xs font-semibold text-[var(--foreground)] transition hover:bg-[color:var(--school-primary-soft)] hover:text-[color:var(--school-primary)]"
                  >
                    Ver Perfil
                  </Link>
                  <Link
                    href={`/dashboard/alunos/${s.id}/boletim`}
                    className="rounded-xl border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] transition hover:border-[color:var(--school-primary)] hover:text-[color:var(--school-primary)]"
                    title="Boletim Escolar"
                  >
                    Boletim
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Seção PROFESSORES */}
      {showTeachers && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Professores ({teachers.length})
            </h2>
            <Link
              href="/dashboard/professores"
              className="text-xs font-medium text-emerald-600 hover:underline flex items-center gap-1"
            >
              Gerenciar corpo docente
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs transition-all hover:border-emerald-500 hover:shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-xs">
                    {t.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-[var(--foreground)] truncate">
                      <HighlightText text={t.fullName} query={initialQuery} />
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                      <HighlightText text={t.email} query={initialQuery} />
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px] text-emerald-700 dark:text-emerald-300">
                  Professor
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Seção TURMAS */}
      {showClasses && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Turmas ({classes.length})
            </h2>
            <Link
              href="/dashboard/turmas"
              className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
            >
              Ver todas as turmas
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <Link
                key={c.id}
                href="/dashboard/turmas"
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs transition-all hover:border-blue-500 hover:shadow-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm text-[var(--foreground)] truncate">
                    <HighlightText text={c.name} query={initialQuery} />
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {c.gradeLevel}º ano · Ano Letivo {c.year}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px] text-blue-700 dark:text-blue-300">
                  Turma
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Seção MISSÕES */}
      {showMissions && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Missões ({missions.length})
            </h2>
            <Link
              href="/dashboard/gamificacao"
              className="text-xs font-medium text-amber-600 hover:underline flex items-center gap-1"
            >
              Abrir gamificação
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {missions.map((m) => (
              <Link
                key={m.id}
                href="/dashboard/gamificacao"
                className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs transition-all hover:border-amber-400 hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-[var(--foreground)] truncate">
                      <HighlightText text={m.title} query={initialQuery} />
                    </p>
                    {m.xpReward > 0 && (
                      <Badge variant="secondary" className="shrink-0 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        +{m.xpReward} XP
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mt-1.5">
                    {m.description ? <HighlightText text={m.description} query={initialQuery} /> : "Sem descrição"}
                  </p>
                </div>
                <div className="mt-3 text-right">
                  <span className="text-[11px] font-semibold text-[color:var(--school-primary)] hover:underline">
                    Abrir missão →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Estado Vazio quando a busca não encontrou nada na aba atual */}
      {currentCount === 0 && (
        <EmptyState
          icon={Search}
          title={`Nenhum resultado encontrado em ${
            activeTab === "students"
              ? "Alunos"
              : activeTab === "teachers"
              ? "Professores"
              : activeTab === "classes"
              ? "Turmas"
              : activeTab === "missions"
              ? "Missões"
              : "todas as categorias"
          }`}
          description={`Não encontramos correspondências para "${initialQuery}". Tente usar outro termo ou limpar os filtros.`}
        />
      )}
    </div>
  );
}
