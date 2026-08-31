"use client";

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { playStreakSound } from "@/lib/sound-effects";

export function StreakBadge({
  streak = 1,
  className,
}: {
  streak?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => playStreakSound()}
      className={cn(
        "group relative flex items-center gap-1.5 rounded-full border border-orange-200 bg-gradient-to-r from-amber-500/10 via-orange-500/15 to-red-500/10 px-3 py-1 text-xs font-bold text-orange-700 shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-orange-900/60 dark:from-orange-950/40 dark:to-amber-950/40 dark:text-orange-300",
        className
      )}
      title={`${streak} dia(s) consecutivo(s) de estudo! Clique para comemorar.`}
    >
      <span className="animate-flame">
        <Flame className="h-4 w-4 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)] fill-orange-500" />
      </span>
      <span className="tabular-nums font-extrabold tracking-tight text-orange-600 dark:text-orange-400">
        {streak} {streak === 1 ? "dia" : "dias"}
      </span>
    </button>
  );
}
