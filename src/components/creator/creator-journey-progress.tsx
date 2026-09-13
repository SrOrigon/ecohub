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

  const percent = Math.round((journey.completed / journey.total) * 100);

  return (
    <div
      className={cn(
        "creator-journey rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 shadow-sm",
        compact && "p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn("font-semibold text-slate-800 dark:text-slate-200", compact ? "text-xs" : "text-base")}>
          {compact ? "Primeiros passos" : "Complete a jornada e liberte os heróis"}
        </p>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {journey.completed}/{journey.total}
        </span>
      </div>

      <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden my-2">
        <div
          className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {!compact && journey.remainingLabel && (
        <p className="mt-1 text-sm text-slate-500">
          Falta 1 passo: <span className="font-medium text-slate-700 dark:text-slate-300">{journey.remainingLabel}</span>
        </p>
      )}

      {compact ? (
        <ul className="mt-1.5 space-y-1">
          {journey.steps.map((step) => {
            const item = (
              <span
                className={cn(
                  "flex items-center gap-2 py-0.5 text-xs transition-colors",
                  step.done
                    ? "text-slate-400 line-through dark:text-slate-500"
                    : "text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 font-medium"
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                )}
                <span className="truncate">{step.label}</span>
              </span>
            );

            if (step.href && !step.done) {
              return (
                <li key={step.id}>
                  <Link href={step.href} className="block hover:underline">
                    {item}
                  </Link>
                </li>
              );
            }
            return <li key={step.id}>{item}</li>;
          })}
        </ul>
      ) : (
        <ol className="mt-3 flex flex-wrap gap-2">
          {journey.steps.map((step) => {
            const content = (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                  step.done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                    : "border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
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
                  <Link href={step.href} className="hover:opacity-90">
                    {content}
                  </Link>
                </li>
              );
            }
            return <li key={step.id}>{content}</li>;
          })}
        </ol>
      )}
    </div>
  );
}
