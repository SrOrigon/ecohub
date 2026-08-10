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
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--hover)] px-6 py-10 text-center",
        className
      )}
    >
      {Icon && (
        <Icon className="mb-3 h-10 w-10 text-[var(--muted-foreground)]" aria-hidden="true" />
      )}
      <p className="text-lg font-semibold text-[var(--foreground)]">{title}</p>
      {description && (
        <p className="mt-2 max-w-md text-base text-[var(--muted-foreground)]">{description}</p>
      )}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
