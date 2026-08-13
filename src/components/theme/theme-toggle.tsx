"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  /** Apenas ícone, sem texto visível */
  compact?: boolean;
}) {
  const { theme, resolvedTheme, toggleTheme, mounted } = useTheme();

  const labelMap = {
    system: `Auto (${resolvedTheme === "dark" ? "Escuro" : "Claro"})`,
    light: "Claro",
    dark: "Escuro",
  };

  const titleMap = {
    system: "Tema automático (sincronizado com seu dispositivo)",
    light: "Tema claro (manual)",
    dark: "Tema escuro (manual)",
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition hover:bg-[var(--hover)]",
        compact ? "px-0" : "px-3",
        className
      )}
      aria-label={titleMap[theme]}
      title={titleMap[theme]}
    >
      {mounted ? (
        theme === "system" ? (
          <Laptop className="h-5 w-5 shrink-0" aria-hidden="true" />
        ) : theme === "dark" ? (
          <Moon className="h-5 w-5 shrink-0" aria-hidden="true" />
        ) : (
          <Sun className="h-5 w-5 shrink-0" aria-hidden="true" />
        )
      ) : (
        <Laptop className="h-5 w-5 shrink-0 opacity-50" aria-hidden="true" />
      )}
      {!compact && (
        <span className="hidden text-sm font-medium sm:inline">
          {labelMap[theme]}
        </span>
      )}
    </button>
  );
}

