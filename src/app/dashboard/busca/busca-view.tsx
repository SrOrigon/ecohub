"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Search,
  GraduationCap,
  Users,
  Sparkles,
  Shield,
  ArrowRight,
  X,
  Mail,
  Fingerprint,
  HeartHandshake,
  FileCheck2,
  Phone,
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
  parentNote?: string | null;
};

export type SearchStaff = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  matchReasons: string[];
};

export type SearchParent = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  children: Array<{
    id: string;
    fullName: string;
    className: string;
  }>;
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

export type SearchApplication = {
  id: string;
  studentName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  gradeLevel: string;
  status: string;
  matchReasons: string[];
};

// Aliases for compatibility
export type SearchTeacher = SearchStaff;

type Props = {
  initialQuery: string;
  students: SearchStudent[];
  staff?: SearchStaff[];
  teachers?: SearchTeacher[];
  parents?: SearchParent[];
  classes: SearchClass[];
  missions: SearchMission[];
  applications?: SearchApplication[];
};

// Destaca com precisão as partes do texto correspondentes
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;

  const cleanQ = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let parts: string[] | null = null;
  try {
    parts = text.split(new RegExp(`(${cleanQ})`, "gi"));
  } catch {
    parts = null;
  }

  if (!parts) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
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
}

function getStaffRoleLabel(role: string): string {
  switch (role) {
    case "director":
      return "Direção";
    case "secretary":
      return "Secretaria";
    case "admin":
      return "Administração";
    case "teacher":
      return "Professor(a)";
    default:
      return "Equipe Escolar";
  }
}

export function BuscaView({
  initialQuery,
  students,
  staff = [],
  teachers = [],
  parents = [],
  classes,
  missions,
  applications = [],
}: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<
    "all" | "students" | "parents" | "staff" | "classes" | "missions" | "applications"
  >("all");

  const effectiveStaff = staff.length > 0 ? staff : teachers;
  const totalResults =
    students.length +
    effectiveStaff.length +
    parents.length +
    classes.length +
    missions.length +
    applications.length;

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
  const showParents = (activeTab === "all" || activeTab === "parents") && parents.length > 0;
  const showStaff = (activeTab === "all" || activeTab === "staff") && effectiveStaff.length > 0;
  const showClasses = (activeTab === "all" || activeTab === "classes") && classes.length > 0;
  const showMissions = (activeTab === "all" || activeTab === "missions") && missions.length > 0;
  const showApplications =
    (activeTab === "all" || activeTab === "applications") && applications.length > 0;

  const currentCount = useMemo(() => {
    switch (activeTab) {
      case "students":
        return students.length;
      case "parents":
        return parents.length;
      case "staff":
        return effectiveStaff.length;
      case "classes":
        return classes.length;
      case "missions":
        return missions.length;
      case "applications":
        return applications.length;
      default:
        return totalResults;
    }
  }, [
    activeTab,
    students,
    parents,
    effectiveStaff,
    classes,
    missions,
    applications,
    totalResults,
  ]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho de busca */}
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

        {/* Input de refino rápido */}
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

      {/* Abas de Categorias */}
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
            <span
              className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "all"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 dark:bg-slate-800 text-[var(--foreground)]"
              }`}
            >
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
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === "students"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-[var(--foreground)]"
                }`}
              >
                {students.length}
              </span>
            </button>
          )}

          {parents.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("parents")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "parents"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] border border-[var(--border)]"
              }`}
            >
              <HeartHandshake className="h-3.5 w-3.5" />
              Responsáveis
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === "parents"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-[var(--foreground)]"
                }`}
              >
                {parents.length}
              </span>
            </button>
          )}

          {effectiveStaff.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("staff")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "staff"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] border border-[var(--border)]"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Professores e Equipe
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === "staff"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-[var(--foreground)]"
                }`}
              >
                {effectiveStaff.length}
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
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === "classes"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-[var(--foreground)]"
                }`}
              >
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
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === "missions"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-[var(--foreground)]"
                }`}
              >
                {missions.length}
              </span>
            </button>
          )}

          {applications.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("applications")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "applications"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] border border-[var(--border)]"
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              Inscrições
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === "applications"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-[var(--foreground)]"
                }`}
              >
                {applications.length}
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
                      <span
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 truncate max-w-[200px]"
                        title={s.email}
                      >
                        <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                        <span className="truncate">
                          <HighlightText text={s.email} query={initialQuery} />
                        </span>
                      </span>
                    )}
                    {s.parentNote && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 px-2 py-0.5 text-[10px]">
                        <HeartHandshake className="h-3 w-3 shrink-0" />
                        {s.parentNote}
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

      {/* Seção RESPONSÁVEIS */}
      {showParents && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
              <HeartHandshake className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              Responsáveis ({parents.length})
            </h2>
            <Link
              href="/dashboard/responsaveis"
              className="text-xs font-medium text-teal-600 hover:underline flex items-center gap-1"
            >
              Ver todos os responsáveis
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {parents.map((p) => (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs transition-all hover:border-teal-500 hover:shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-sm font-bold text-white shadow-xs">
                        {p.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-[var(--foreground)] truncate">
                          <HighlightText text={p.fullName} query={initialQuery} />
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                          {p.email ? <HighlightText text={p.email} query={initialQuery} /> : "Sem e-mail"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px] text-teal-700 dark:text-teal-300">
                      Responsável
                    </Badge>
                  </div>

                  {/* Detalhes de contato e filhos */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-[var(--muted-foreground)]">
                    {p.phone && (
                      <p className="flex items-center gap-1.5 text-[11px]">
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{p.phone}</span>
                      </p>
                    )}
                    {p.children.length > 0 && (
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2 text-[11px]">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {p.children.length === 1 ? "Filho(a) vinculado:" : "Filhos vinculados:"}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {p.children.map((c) => (
                            <Link
                              key={c.id}
                              href={`/dashboard/alunos/${c.id}`}
                              className="inline-flex items-center gap-1 rounded-md bg-[var(--surface)] px-1.5 py-0.5 text-xs font-semibold text-[color:var(--school-primary)] border border-[var(--border)] hover:underline"
                            >
                              <GraduationCap className="h-3 w-3" />
                              {c.fullName}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 border-t border-[var(--border-subtle)] pt-2.5">
                  <Link
                    href={`/dashboard/responsaveis/${p.id}`}
                    className="block text-center text-xs font-semibold text-teal-600 hover:underline"
                  >
                    Ver perfil do responsável →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Seção PROFESSORES E EQUIPE */}
      {showStaff && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Professores e Equipe Escolar ({effectiveStaff.length})
            </h2>
            <Link
              href="/dashboard/professores"
              className="text-xs font-medium text-emerald-600 hover:underline flex items-center gap-1"
            >
              Ver corpo docente e equipe
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {effectiveStaff.map((t) => (
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
                <Badge
                  variant="secondary"
                  className="shrink-0 text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold"
                >
                  {getStaffRoleLabel(t.role)}
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
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px] font-bold text-amber-700 dark:text-amber-300"
                      >
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

      {/* Seção INSCRIÇÕES / PRÉ-MATRÍCULAS */}
      {showApplications && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
              <FileCheck2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Inscrições / Pré-Matrículas ({applications.length})
            </h2>
            <Link
              href="/dashboard/matriculas"
              className="text-xs font-medium text-purple-600 hover:underline flex items-center gap-1"
            >
              Gerenciar inscrições
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs transition-all hover:border-purple-400 hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-[var(--foreground)] truncate">
                      <HighlightText text={app.studentName} query={initialQuery} />
                    </p>
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                      {app.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Ano: {app.gradeLevel} · Responsável: <HighlightText text={app.parentName} query={initialQuery} />
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                    {app.parentEmail}
                  </p>
                </div>
                <div className="mt-3 border-t border-[var(--border-subtle)] pt-2 text-right">
                  <Link
                    href="/dashboard/matriculas"
                    className="text-xs font-semibold text-purple-600 hover:underline"
                  >
                    Revisar inscrição →
                  </Link>
                </div>
              </div>
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
              : activeTab === "parents"
              ? "Responsáveis"
              : activeTab === "staff"
              ? "Professores e Equipe"
              : activeTab === "classes"
              ? "Turmas"
              : activeTab === "missions"
              ? "Missões"
              : activeTab === "applications"
              ? "Inscrições"
              : "todas as categorias"
          }`}
          description={`Não encontramos registros para "${initialQuery}". Verifique a grafia ou tente buscar por outro termo.`}
        />
      )}
    </div>
  );
}
