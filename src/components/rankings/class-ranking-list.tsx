"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClassRankEntry, ClassRankingMetric } from "@/lib/rankings";
import { getClassMetricLabel, getClassScoreLabel } from "@/lib/rankings";
import { GraduationCap, Users } from "lucide-react";

export function ClassRankingList({
  items,
  metric,
  highlightClassId,
  linkClasses = true,
}: {
  items: ClassRankEntry[];
  metric: ClassRankingMetric;
  highlightClassId?: string | null;
  linkClasses?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Cadastre turmas com alunos ativos para ver o ranking entre salas.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((item) => {
        const isMine = item.classId === highlightClassId;
        const isTop3 = item.rank <= 3;
        const score = getClassScoreLabel(item, metric);

        return (
          <li
            key={item.classId}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-xl p-4 transition",
              isMine
                ? "border-2 border-indigo-400 bg-indigo-50"
                : isTop3
                  ? "border border-emerald-200 bg-emerald-50/50"
                  : "border border-slate-100 bg-white"
            )}
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
                isTop3 ? "bg-emerald-600" : "bg-indigo-600"
              )}
            >
              {item.rank}
            </span>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                <GraduationCap className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                {linkClasses ? (
                  <Link
                    href="/dashboard/turmas"
                    className="block truncate font-semibold text-indigo-600 hover:underline"
                  >
                    {item.className}
                  </Link>
                ) : (
                  <p className="block truncate font-semibold text-slate-900">{item.className}</p>
                )}
                <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {item.studentCount} aluno(s)
                  </span>
                  {item.gradeLevel && <span>· {item.gradeLevel}</span>}
                  {isMine && (
                    <Badge variant="secondary">Sua turma</Badge>
                  )}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right whitespace-nowrap">
              <p className="text-lg font-bold text-indigo-700">{score}</p>
              <p className="text-xs text-slate-500">{getClassMetricLabel(metric)}</p>
            </div>

            <div className="flex w-full flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 sm:w-auto sm:border-0 sm:pt-0">
              <MetricPill label="Engajamento" value={`${item.engagementScore}%`} />
              <MetricPill label="Missões" value={`${item.missionRate}%`} />
              <MetricPill label="Freq." value={`${item.attendanceRate}%`} />
              <MetricPill label="Média" value={item.avgGrade.toFixed(1)} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5">
      {label}: <strong>{value}</strong>
    </span>
  );
}
