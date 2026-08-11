"use client";

import { cn } from "@/lib/utils";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Crown, Medal, Trophy } from "lucide-react";
import type { StudentRankEntry } from "@/lib/rankings";

const PODIUM_STYLES = [
  {
    order: "order-2 sm:order-1",
    height: "h-24 sm:h-28",
    bg: "bg-gradient-to-t from-amber-600 to-amber-400",
    ring: "ring-amber-300",
    icon: Medal,
    label: "2º",
  },
  {
    order: "order-1 sm:order-2",
    height: "h-32 sm:h-36",
    bg: "bg-gradient-to-t from-yellow-600 to-yellow-400",
    ring: "ring-yellow-300",
    icon: Crown,
    label: "1º",
  },
  {
    order: "order-3",
    height: "h-20 sm:h-24",
    bg: "bg-gradient-to-t from-orange-700 to-orange-500",
    ring: "ring-orange-300",
    icon: Trophy,
    label: "3º",
  },
] as const;

export function RankingPodium({
  items,
  scoreKey = "scoreLabel",
  kidFriendly = false,
}: {
  items: StudentRankEntry[];
  scoreKey?: "scoreLabel" | "xpTotal";
  kidFriendly?: boolean;
}) {
  const top3 = items.slice(0, 3);
  if (top3.length === 0) return null;

  const ordered = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <div className="flex items-end justify-center gap-3 px-2 pb-2 pt-4 sm:gap-5">
      {ordered.map((entry, idx) => {
        const style = PODIUM_STYLES[top3.length >= 3 ? idx : idx === 0 ? 1 : idx === 1 ? 0 : 2] ?? PODIUM_STYLES[1];
        const Icon = style.icon;
        const score =
          scoreKey === "xpTotal" ? `${entry.xpTotal.toLocaleString("pt-BR")} XP` : entry.scoreLabel;

        return (
          <div
            key={entry.id}
            className={cn("flex w-24 flex-col items-center sm:w-28", top3.length >= 3 ? style.order : "")}
          >
            <div className={cn("relative mb-2 rounded-full ring-4", style.ring)}>
              <ProfileAvatar
                name={entry.name}
                avatarUrl={entry.avatarUrl}
                size={idx === 1 || top3.length < 3 ? "lg" : "md"}
              />
              <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow">
                <Icon className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              </span>
            </div>
            <p
              className={cn(
                "max-w-full truncate text-center font-bold",
                kidFriendly ? "text-base text-indigo-900" : "text-sm text-slate-900"
              )}
            >
              {entry.displayName}
            </p>
            <p className="text-xs font-semibold text-indigo-600">{score}</p>
            <div
              className={cn(
                "mt-2 flex w-full items-end justify-center rounded-t-xl text-xs font-bold text-white",
                style.height,
                style.bg
              )}
            >
              <span className="mb-2">{style.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
