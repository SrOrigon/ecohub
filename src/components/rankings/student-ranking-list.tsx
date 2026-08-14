"use client";

import Link from "next/link";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudentRankEntry, StudentRankingMetric } from "@/lib/rankings";
import { getStudentMetricLabel } from "@/lib/rankings";
import { TrendingUp, Minus } from "lucide-react";

export function StudentRankingList({
  items,
  metric,
  highlightId,
  kidFriendly = false,
  linkStudents = true,
  maxItems = 15,
}: {
  items: StudentRankEntry[];
  metric: StudentRankingMetric;
  highlightId?: string;
  kidFriendly?: boolean;
  linkStudents?: boolean;
  maxItems?: number;
}) {
  const visible = items.slice(0, maxItems);
  const metricLabel = getStudentMetricLabel(metric);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Ainda não há dados para ranking por {metricLabel.toLowerCase()}.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {visible.map((item) => {
        const isMe = item.id === highlightId;
        const isTop3 = item.rank <= 3;

        return (
          <li
            key={item.id}
            className={cn(
              "grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 rounded-xl p-3 transition",
              isMe
                ? "border-2 border-indigo-400 bg-indigo-50 shadow-sm"
                : isTop3
                  ? kidFriendly
                    ? "border border-amber-200 bg-amber-50/60"
                    : "border border-amber-100 bg-amber-50/40"
                  : kidFriendly
                    ? "border border-indigo-100 bg-white"
                    : "bg-slate-50"
            )}
          >
            <span
              className={cn(
                "row-span-2 flex shrink-0 items-center justify-center self-center rounded-full font-bold text-white",
                isTop3 ? "bg-amber-500" : "bg-indigo-600",
                kidFriendly ? "h-10 w-10 text-base" : "h-8 w-8 text-sm"
              )}
              aria-label={`Posição ${item.rank}`}
            >
              {item.rank}
            </span>

            <div className="row-span-2 shrink-0 self-center">
              <ProfileAvatar name={item.name} avatarUrl={item.avatarUrl} size={kidFriendly ? "md" : "sm"} />
            </div>

            <div className="min-w-0 self-center">
              {linkStudents && !kidFriendly ? (
                <Link
                  href={`/dashboard/alunos/${item.id}`}
                  className="block truncate font-medium text-indigo-600 hover:underline"
                >
                  {item.displayName}
                </Link>
              ) : (
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("truncate font-medium", isMe ? "text-indigo-900" : "text-slate-900")}>
                    {item.displayName}
                  </span>
                  {isMe && !kidFriendly && (
                    <Badge variant="secondary" className="shrink-0">
                      Você
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="shrink-0 self-center text-right">
              <p className="whitespace-nowrap font-bold text-indigo-600">{item.scoreLabel}</p>
              <p className="whitespace-nowrap text-xs text-slate-500">{metricUnit(metric)}</p>
            </div>

            <p className="col-span-2 col-start-3 truncate text-xs text-slate-500">
              {item.className} · Nv. {item.level}
              {item.badgesCount > 0 && ` · ${item.badgesCount} badge(s)`}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function YourPositionCard({
  rank,
  total,
  metric,
  scope,
  scoreLabel,
  kidFriendly = false,
}: {
  rank: number;
  total: number;
  metric: StudentRankingMetric;
  scope: "school" | "class";
  scoreLabel: string;
  kidFriendly?: boolean;
}) {
  const percentile = total > 0 ? Math.round(((total - rank + 1) / total) * 100) : 0;
  const scopeLabel = scope === "class" ? "na turma" : "na escola";

  let message = "Continue participando  -  cada missão e exercício conta!";
  if (rank === 1) message = "Parabéns! Você lidera o ranking. Inspire colegas com colaboração.";
  else if (rank <= 3) message = "Excelente! Você está no pódio. Mantenha o ritmo com foco e respeito.";
  else if (percentile >= 75) message = "Ótimo desempenho! Você está entre os melhores  -  siga evoluindo.";
  else if (percentile >= 50) message = "Bom progresso! Foque nas missões da semana para subir posições.";
  else message = "Cada passo importa! Complete missões e exercícios para ganhar XP e subir no ranking.";

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        kidFriendly ? "border-indigo-200 bg-gradient-to-br from-indigo-50 to-white" : "border-slate-200 bg-slate-50"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sua posição</p>
          <p className={cn("font-bold text-indigo-700", kidFriendly ? "text-3xl" : "text-2xl")}>
            #{rank}{" "}
            <span className="text-base font-normal text-slate-600">
              de {total} {scopeLabel}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">{getStudentMetricLabel(metric)}</p>
          <p className="text-xl font-bold text-slate-900">{scoreLabel}</p>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2 text-sm text-slate-700">
        {rank <= Math.ceil(total / 2) ? (
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
        ) : (
          <Minus className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden="true" />
        )}
        <p>{message}</p>
      </div>
    </div>
  );
}

function metricUnit(metric: StudentRankingMetric) {
  switch (metric) {
    case "xp":
      return "XP total";
    case "xpWeek":
      return "XP semana";
    case "grade":
      return "Média";
    case "missions":
      return "Missões";
  }
}
