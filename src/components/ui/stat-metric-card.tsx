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
    <Card className={cn("stat-card h-full", className)}>
      <CardContent className="flex items-start justify-between gap-2 p-3 sm:p-4">
        <div className="min-w-0">
          <p className="stat-card-label">{label}</p>
          <p className="stat-card-value mt-1 tabular-nums">{value}</p>
        </div>
        {Icon ? (
          <Icon
            className={cn("mt-0.5 h-5 w-5 shrink-0 text-indigo-600", iconClassName)}
            aria-hidden="true"
          />
        ) : null}
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link href={href} className="min-w-0 rounded-xl outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">
      {card}
    </Link>
  );
}
