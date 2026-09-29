"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function SearchBarContent({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQ = searchParams?.get("q") ?? "";
  const [value, setValue] = useState(currentQ);

  useEffect(() => {
    setValue(currentQ);
  }, [currentQ]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
  }

  return (
    <form onSubmit={handleSubmit} className={cn("relative w-full", className)} role="search">
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
        className="h-9 min-h-9 w-full pl-9 pr-14 text-sm rounded-xl border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shadow-2xs focus:bg-white dark:focus:bg-slate-900 transition-all"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          title="Limpar busca"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={openSpotlight}
        className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center rounded-md border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-800/90 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400 shadow-2xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 md:inline-flex cursor-pointer"
        title="Busca rápida (Ctrl+K)"
      >
        ⌘K
      </button>
    </form>
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
