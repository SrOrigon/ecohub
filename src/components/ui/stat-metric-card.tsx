import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatMetricCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  href,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  href?: string;
  className?: string;
}) {
  const card = (
    <Card className={cn("stat-card h-full transition-all duration-200 hover:shadow-md hover:border-indigo-300/70 dark:hover:border-indigo-800/70", className)}>
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="stat-card-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="stat-card-value mt-1.5 tabular-nums font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/15 text-indigo-600 dark:text-indigo-400 transition-transform duration-200 group-hover:scale-110">
            <Icon
              className={cn("h-5 w-5", iconClassName)}
              aria-hidden="true"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link href={href} className="group min-w-0 rounded-xl outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">
      {card}
    </Link>
  );
}
