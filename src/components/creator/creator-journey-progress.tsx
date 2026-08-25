import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { CreatorJourneySnapshot } from "@/lib/creator-journey";
import { cn } from "@/lib/utils";

export function CreatorJourneyProgress({
  journey,
  compact = false,
}: {
  journey: CreatorJourneySnapshot;
  compact?: boolean;
}) {
  if (journey.completed >= journey.total) {
    return null;
  }

  return (
    <div className={cn("creator-journey rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm", compact && "p-3")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("font-semibold text-slate-900", compact ? "text-sm" : "text-base")}>
          {compact ? "Primeiros passos" : "Complete a jornada e liberte os heróis"}
        </p>
        <span className="text-xs font-bold text-[color:var(--school-primary)]">
          {journey.completed}/{journey.total}
        </span>
      </div>
      {!compact && journey.remainingLabel && (
        <p className="mt-1 text-sm text-slate-500">
          Falta 1 passo: <span className="font-medium text-slate-700">{journey.remainingLabel}</span>
        </p>
      )}
      <ol className={cn("mt-3 flex flex-wrap gap-2", compact && "mt-2 gap-1.5")}>
        {journey.steps.map((step) => {
          const content = (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                step.done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-slate-50 text-slate-600",
                compact && "px-2 py-0.5"
              )}
            >
              {step.done ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              {step.label}
            </span>
          );
          if (step.href && !step.done) {
            return (
              <li key={step.id}>
                <Link href={step.href} className="hover:opacity-90">{content}</Link>
              </li>
            );
          }
          return <li key={step.id}>{content}</li>;
        })}
      </ol>
    </div>
  );
}
