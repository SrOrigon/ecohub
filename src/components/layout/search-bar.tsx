"use client";

import { useRouter } from "next/navigation";
import { FormEvent } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const q = new FormData(form).get("q")?.toString().trim();
    if (q) router.push(`/dashboard/busca?q=${encodeURIComponent(q)}`);
  }

  function openSpotlight() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
  }

  return (
    <form onSubmit={handleSubmit} className={cn("relative w-full", className)} role="search">
      <label htmlFor="global-search" className="sr-only">
        Buscar alunos ou turmas
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
        aria-hidden="true"
      />
      <Input
        id="global-search"
        placeholder="Buscar alunos, turmas..."
        className="h-9 min-h-9 pl-9 pr-14 text-xs rounded-xl border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shadow-2xs focus:bg-white dark:focus:bg-slate-900 transition-all"
        name="q"
        autoComplete="off"
      />
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
