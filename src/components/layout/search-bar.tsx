"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  X,
  GraduationCap,
  Users,
  Shield,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type LiveResultItem = {
  id: string;
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  href: string;
  type: "aluno" | "turma" | "professor" | "missao";
};

type LiveSearchResults = {
  students: LiveResultItem[];
  classes: LiveResultItem[];
  teachers: LiveResultItem[];
  missions: LiveResultItem[];
};

function SearchBarContent({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQ = searchParams?.get("q") ?? "";

  const [value, setValue] = useState(currentQ);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LiveSearchResults>({
    students: [],
    classes: [],
    teachers: [],
    missions: [],
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setValue(currentQ);
  }, [currentQ]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Busca instantânea ao digitar (debounced)
  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults({ students: [], classes: [], teachers: [], missions: [] });
      setIsOpen(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/live?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("[search-bar:live]", err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsOpen(false);
    const q = value.trim();
    if (q) {
      router.push(`/dashboard/busca?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/dashboard/busca");
    }
  }

  function openSpotlight() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
  }

  function handleClear() {
    setValue("");
    setIsOpen(false);
    setResults({ students: [], classes: [], teachers: [], missions: [] });
  }

  const hasAnyResults =
    results.students.length > 0 ||
    results.classes.length > 0 ||
    results.teachers.length > 0 ||
    results.missions.length > 0;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit} className="relative w-full" role="search">
        <label htmlFor="global-search" className="sr-only">
          Buscar alunos, turmas, professores ou missões
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
          aria-hidden="true"
        />
        <Input
          id="global-search"
          placeholder="Buscar alunos, turmas, missões..."
          className="h-9 min-h-9 w-full pl-9 pr-18 text-sm rounded-xl border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shadow-2xs focus:bg-white dark:focus:bg-slate-900 transition-all"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => {
            if (value.trim().length >= 2 && hasAnyResults) setIsOpen(true);
          }}
          autoComplete="off"
        />

        {/* Indicador de carregamento ou botão limpar */}
        <div className="absolute right-9 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[color:var(--school-primary)]" />
          ) : value ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {/* Atalho ⌘K */}
        <button
          type="button"
          onClick={openSpotlight}
          className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center rounded-md border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-800/90 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400 shadow-2xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 md:inline-flex cursor-pointer"
          title="Busca rápida (Ctrl+K)"
        >
          ⌘K
        </button>
      </form>

      {/* Dropdown Live Preview Flutuante */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md shadow-xl transition-all">
          <div className="max-h-96 overflow-y-auto p-2 divide-y divide-[var(--border-subtle)]">
            {/* Alunos */}
            {results.students.length > 0 && (
              <div className="py-1.5 first:pt-0">
                <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                  <GraduationCap className="h-3 w-3 text-[color:var(--school-primary)]" />
                  Alunos
                </p>
                {results.students.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-[var(--hover)] group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--school-primary-soft)] text-xs font-bold text-[color:var(--school-primary)]">
                        {item.title.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--foreground)] truncate group-hover:text-[color:var(--school-primary)]">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-[var(--muted-foreground)] shrink-0">
                      Ver →
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Professores */}
            {results.teachers.length > 0 && (
              <div className="py-1.5">
                <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-emerald-600" />
                  Professores
                </p>
                {results.teachers.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-[var(--hover)] group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {item.title.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--foreground)] truncate group-hover:text-emerald-600">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-[var(--muted-foreground)] shrink-0">
                      Docente →
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Turmas */}
            {results.classes.length > 0 && (
              <div className="py-1.5">
                <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-blue-600" />
                  Turmas
                </p>
                {results.classes.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-[var(--hover)] group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--foreground)] truncate group-hover:text-blue-600">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                        {item.subtitle}
                      </p>
                    </div>
                    <span className="text-[10px] font-medium text-[var(--muted-foreground)] shrink-0">
                      Turma →
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Missões */}
            {results.missions.length > 0 && (
              <div className="py-1.5">
                <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Missões
                </p>
                {results.missions.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-[var(--hover)] group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--foreground)] truncate group-hover:text-amber-600">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                        {item.subtitle}
                      </p>
                    </div>
                    <span className="text-[10px] font-medium text-[var(--muted-foreground)] shrink-0">
                      Missão →
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {!hasAnyResults && !loading && (
              <div className="px-3 py-6 text-center text-xs text-[var(--muted-foreground)]">
                Nenhum resultado rápido para &ldquo;{value}&rdquo;. Pressione Enter para pesquisar no painel.
              </div>
            )}
          </div>

          {/* Rodapé do dropdown: ver todos os resultados */}
          <Link
            href={`/dashboard/busca?q=${encodeURIComponent(value.trim())}`}
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--hover)] px-3.5 py-2 text-xs font-semibold text-[color:var(--school-primary)] transition hover:bg-[color:var(--school-primary-soft)]"
          >
            <span>Ver todos os resultados no painel</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

export function SearchBar({ className }: { className?: string }) {
  return (
    <Suspense
      fallback={
        <div className={cn("relative w-full", className)}>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
          <Input
            placeholder="Buscar alunos, turmas, missões..."
            className="h-9 min-h-9 w-full pl-9 pr-14 text-sm rounded-xl border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60"
            disabled
          />
        </div>
      }
    >
      <SearchBarContent className={className} />
    </Suspense>
  );
}
