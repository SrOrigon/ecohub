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
    <Card className={cn("stat-card group/card h-full transition-all duration-300 hover:shadow-lg hover:border-indigo-500/30 hover:-translate-y-0.5 relative overflow-hidden", className)}>
      <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-bl-3xl pointer-events-none" />
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5 relative z-10">
        <div className="min-w-0 flex-1">
          <p className="stat-card-label text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="stat-card-value mt-2 tabular-nums font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        {Icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-indigo-600/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-2xs transition-all duration-300 group-hover/card:scale-110 group-hover/card:shadow-sm group-hover/card:shadow-indigo-500/20">
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
    <Link href={href} className="group min-w-0 rounded-2xl outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] block transition-transform active:scale-[0.98]">
      {card}
    </Link>
  );
}
