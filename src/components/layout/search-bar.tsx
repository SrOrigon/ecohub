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
        className="h-10 min-h-10 pl-9 pr-16"
        name="q"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={openSpotlight}
        className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center rounded-md border border-[var(--border)] bg-[var(--hover)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)] lg:inline-flex"
        title="Busca rápida"
      >
        ⌘K
      </button>
    </form>
  );
}
