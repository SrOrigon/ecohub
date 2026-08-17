import Link from "next/link";
import { Medal } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

export const AUTH_CARD_CLASS =
  "w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]";

export const AUTH_BACK_LINK_CLASS =
  "mb-2 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[color:var(--school-primary)]";

export const AUTH_ICON_WRAP_CLASS =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950";

export function AuthShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="auth-page flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <Medal className="h-7 w-7 text-[color:var(--school-primary)]" aria-hidden="true" />
          <span className="text-lg font-bold text-[var(--foreground)]">Ecohub</span>
        </Link>
        <ThemeToggle compact />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-10 pt-2 sm:pb-16">
        <div className={cn("w-full", wide ? "max-w-3xl" : "max-w-lg")}>{children}</div>
      </main>
    </div>
  );
}
