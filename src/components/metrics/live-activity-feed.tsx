"use client";

import Link from "next/link";
import {
  BookOpen,
  PenLine,
  Target,
  Zap,
  Activity,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { useLiveMetricsOptional } from "@/components/metrics/live-metrics-provider";
import type { ActivityEvent, ActivityEventType } from "@/lib/live-metrics";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  ActivityEventType,
  { icon: typeof Zap; variant: "success" | "warning" | "secondary" | "default"; prefix: string }
> = {
  xp: { icon: Zap, variant: "success", prefix: "XP" },
  exercise: { icon: PenLine, variant: "warning", prefix: "Exercício" },
  mission: { icon: Target, variant: "default", prefix: "Missão" },
  grade: { icon: BookOpen, variant: "secondary", prefix: "Nota" },
};

export function LiveActivityFeed({
  title = "Atividade recente",
  description = "Atualização automática conforme alunos ganham XP, entregam exercícios e concluem missões",
  maxItems = 12,
  linkStudents = true,
  kidFriendly = false,
}: {
  title?: string;
  description?: string;
  maxItems?: number;
  linkStudents?: boolean;
  kidFriendly?: boolean;
}) {
  const ctx = useLiveMetricsOptional();
  const activities = ctx?.snapshot?.activities.slice(0, maxItems) ?? [];

  return (
    <Card className={cn("overflow-hidden", kidFriendly ? "kid-card" : undefined)}>
      <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          {title}
        </CardTitle>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {activities.length === 0 ? (
          <EmptyState
            title="Sem atividade recente"
            description="Transações e entregas aparecerão aqui em tempo real."
            className="py-6"
          />
        ) : (
          <ul className="space-y-2" aria-live="polite" aria-relevant="additions">
            {activities.map((event) => (
              <ActivityRow
                key={event.id}
                event={event}
                linkStudents={linkStudents}
                kidFriendly={kidFriendly}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function LiveStatsStrip({ className }: { className?: string }) {
  const ctx = useLiveMetricsOptional();
  const stats = ctx?.snapshot?.stats;
  if (!stats) return null;

  const items = [
    {
      label: "XP na semana",
      value: stats.xpThisWeek.toLocaleString("pt-BR"),
      icon: Zap,
      iconClass: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      highlight: true,
    },
    {
      label: "Para corrigir",
      value: String(stats.pendingGrading),
      icon: Clock,
      iconClass:
        stats.pendingGrading > 0
          ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
          : "text-slate-400 bg-slate-500/10 border-slate-500/20",
      alert: stats.pendingGrading > 0,
    },
    {
      label: "Entregas hoje",
      value: String(stats.exerciseSubmissionsToday),
      icon: CheckCircle2,
      iconClass: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Missões ativas",
      value: String(stats.activeMissions),
      icon: Target,
      iconClass: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)} aria-live="polite">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-3.5 shadow-2xs backdrop-blur-sm transition-all duration-150 hover:shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800"
          >
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", item.iconClass)}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
              <p
                className={cn(
                  "text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100",
                  item.alert && "text-amber-600 dark:text-amber-400",
                  item.highlight && "text-indigo-600 dark:text-indigo-400"
                )}
              >
                {item.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LiveStudentStatsCard({ className }: { className?: string }) {
  const ctx = useLiveMetricsOptional();
  const student = ctx?.snapshot?.student;
  if (!student) return null;

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4",
        className
      )}
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Seu progresso ao vivo</p>
      <div className="stat-grid mt-3 gap-3">
        <LiveStat label="XP total" value={String(student.xpTotal)} />
        <LiveStat label="XP semana" value={`+${student.xpThisWeek}`} accent />
        <LiveStat label="Turma" value={student.classRank ? `#${student.classRank}` : " - "} />
        <LiveStat label="Escola" value={student.schoolRank ? `#${student.schoolRank}` : " - "} />
      </div>
    </div>
  );
}

function LiveStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("text-lg font-bold", accent ? "text-emerald-600" : "text-slate-900")}>{value}</p>
    </div>
  );
}

function ActivityRow({
  event,
  linkStudents,
  kidFriendly,
}: {
  event: ActivityEvent;
  linkStudents: boolean;
  kidFriendly: boolean;
}) {
  const config = TYPE_CONFIG[event.type];
  const Icon = config.icon;
  const firstName = event.studentName.split(" ")[0];

  return (
    <li
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-sm transition sm:items-center",
        kidFriendly ? "border-indigo-100 bg-white" : "border-slate-100 bg-slate-50/80"
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500 sm:mt-0" aria-hidden="true" />
      <div className="min-w-0 overflow-hidden">
        <p className="font-medium text-slate-900">
          {linkStudents && !kidFriendly ? (
            <Link href={`/dashboard/alunos/${event.studentId}`} className="text-indigo-600 hover:underline">
              {event.studentName}
            </Link>
          ) : (
            firstName
          )}
          <span className="font-normal text-slate-600"> · {event.label}</span>
        </p>
        {event.detail && <p className="truncate text-xs text-slate-500">{event.detail}</p>}
        <p className="text-xs text-slate-400">{formatRelativeTime(event.createdAt)}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 self-center">
        {event.amount != null && event.amount > 0 && (
          <Badge variant={config.variant}>+{event.amount} XP</Badge>
        )}
        <Badge variant="secondary">{config.prefix}</Badge>
      </div>
    </li>
  );
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  return formatDate(date);
}
