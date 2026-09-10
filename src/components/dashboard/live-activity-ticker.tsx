"use client";

import { useEffect, useState } from "react";
import { Activity, Flame, Sparkles, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActivityTickerItem = {
  id: string;
  icon: "trophy" | "flame" | "sparkles" | "users";
  text: string;
  timestamp?: string;
};

const DEFAULT_HIGHLIGHTS: ActivityTickerItem[] = [
  { id: "1", icon: "sparkles", text: "Ambiente Ecohub conectado e sincronizado com toda a instituição" },
  { id: "2", icon: "flame", text: "Alunos com ofensivas ativas somam mais de 45 dias de estudo contínuo" },
  { id: "3", icon: "trophy", text: "Rankings semanais atualizados automaticamente com novas medalhas" },
  { id: "4", icon: "users", text: "Metas coletivas em andamento motivando o trabalho em equipe das turmas" },
];

export function LiveActivityTicker({
  items = DEFAULT_HIGHLIGHTS,
  className,
}: {
  items?: ActivityTickerItem[];
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeItems = items.length > 0 ? items : DEFAULT_HIGHLIGHTS;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeItems.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [activeItems.length]);

  const current = activeItems[currentIndex];

  const renderIcon = (type: string) => {
    switch (type) {
      case "flame":
        return <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />;
      case "trophy":
        return <Trophy className="h-3.5 w-3.5 text-amber-500" />;
      case "users":
        return <Users className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-indigo-500" />;
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-indigo-100/90 bg-gradient-to-r from-indigo-50/60 via-white to-purple-50/40 px-3.5 py-2 shadow-sm backdrop-blur-sm dark:border-indigo-950 dark:from-indigo-950/30 dark:via-slate-900/60 dark:to-purple-950/20",
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 rounded-md bg-indigo-600/10 px-2 py-0.5 font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300 shrink-0">
          <Activity className="h-3 w-3 animate-pulse text-indigo-600 dark:text-indigo-400" />
          Destaques ao vivo
        </span>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div key={current.id} className="flex items-center gap-2 animate-ticker-item">
            {renderIcon(current.icon)}
            <p className="truncate font-medium text-slate-800 dark:text-slate-200">
              {current.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
