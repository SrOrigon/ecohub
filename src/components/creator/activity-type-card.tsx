import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function ActivityTypeCard({
  title,
  description,
  icon: Icon,
  iconClassName,
  className,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "creator-activity-card group flex min-h-[7.5rem] flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[color:var(--school-primary-ring)] hover:shadow-md",
        className
      )}
    >
      <div
        className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center rounded-full",
          iconClassName ?? "bg-indigo-100 text-indigo-600"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
