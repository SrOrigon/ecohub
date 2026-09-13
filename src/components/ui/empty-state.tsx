import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/40 via-white/30 to-transparent dark:from-indigo-950/20 dark:via-slate-900/30 px-6 py-10 text-center shadow-2xs backdrop-blur-xs",
        className
      )}
    >
      {Icon && (
        <div className="mb-3.5 flex h-13 w-13 items-center justify-center rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 bg-gradient-to-br from-indigo-100/80 to-purple-100/50 dark:from-indigo-950/60 dark:to-purple-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs shadow-indigo-500/15">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <p className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      )}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
