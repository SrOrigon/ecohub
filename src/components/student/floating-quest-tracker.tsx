"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Compass, Sparkles, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuestItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  xpReward: number;
  kind?: "exercise" | "mission" | "hometask";
};

export function FloatingQuestTracker({
  quests = [],
}: {
  quests: QuestItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (quests.length === 0) return null;

  const topQuest = quests[0];

  return (
    <aside
      aria-label="Rastreador de Missões"
      className="fixed bottom-4 right-4 z-40 max-w-sm transition-all duration-300"
    >
      <div className="overflow-hidden rounded-2xl border border-indigo-200/90 bg-white/95 shadow-2xl backdrop-blur-md dark:border-indigo-900/60 dark:bg-slate-900/95">
        {/* Header Bar */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 px-4 py-2.5 text-left text-white transition-opacity hover:opacity-95"
          aria-expanded={isOpen}
          aria-controls="quest-list"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">
              <Compass className="h-3.5 w-3.5 text-white" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-100">
                Missões Ativas ({quests.length})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-amber-950">
              +{topQuest.xpReward} XP
            </span>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </div>
        </button>

        {/* Minimized Quick Action */}
        {!isOpen && (
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs">
            <p className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-200">
              {topQuest.title}
            </p>
            <Link
              href={topQuest.href}
              className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
            >
              Fazer agora →
            </Link>
          </div>
        )}

        {/* Expanded Quest List */}
        {isOpen && (
          <div id="quest-list" className="max-h-60 space-y-2 overflow-y-auto p-3">
            {quests.map((quest, idx) => (
              <Link
                key={quest.id}
                href={quest.href}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border p-2.5 text-xs transition hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-slate-800/60",
                  idx === 0
                    ? "border-indigo-200 bg-indigo-50/30 dark:border-indigo-900"
                    : "border-slate-100 dark:border-slate-800"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">
                    {quest.title}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{quest.subtitle}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    +{quest.xpReward} XP
                  </span>
                  <span className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Ir
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
