"use client";

import { Moon, Sun } from "lucide-react";
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
  const { theme, toggleTheme, mounted } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition hover:bg-[var(--hover)]",
        compact ? "px-0" : "px-3",
        className
      )}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-5 w-5 shrink-0" aria-hidden="true" />
        ) : (
          <Moon className="h-5 w-5 shrink-0" aria-hidden="true" />
        )
      ) : (
        <Moon className="h-5 w-5 shrink-0 opacity-50" aria-hidden="true" />
      )}
      {!compact && (
        <span className="hidden text-sm font-medium sm:inline">
          {isDark ? "Claro" : "Escuro"}
        </span>
      )}
    </button>
  );
}
