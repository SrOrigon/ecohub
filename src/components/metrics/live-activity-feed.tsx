"use client";

import Link from "next/link";
import {
  BookOpen,
  PenLine,
  Target,
  Zap,
  Activity,
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
    <Card className={kidFriendly ? "kid-card" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          {title}
        </CardTitle>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
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
    { label: "XP semana", value: stats.xpThisWeek.toLocaleString("pt-BR"), highlight: true },
    { label: "P/ corrigir", value: String(stats.pendingGrading), alert: stats.pendingGrading > 0 },
    { label: "Entregas hoje", value: String(stats.exerciseSubmissionsToday) },
    { label: "Missões ativas", value: String(stats.activeMissions) },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 sm:grid-cols-4",
        className
      )}
      aria-live="polite"
    >
      {items.map((item) => (
        <div key={item.label} className="text-center sm:text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
          <p
            className={cn(
              "text-xl font-bold",
              item.alert ? "text-red-600" : item.highlight ? "text-indigo-700" : "text-slate-900"
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
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
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <LiveStat label="XP total" value={String(student.xpTotal)} />
        <LiveStat label="XP semana" value={`+${student.xpThisWeek}`} accent />
        <LiveStat label="Turma" value={student.classRank ? `#${student.classRank}` : "—"} />
        <LiveStat label="Escola" value={student.schoolRank ? `#${student.schoolRank}` : "—"} />
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
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition",
        kidFriendly ? "border-indigo-100 bg-white" : "border-slate-100 bg-slate-50/80"
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden="true" />
        <div className="min-w-0">
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
          {event.detail && <p className="text-xs text-slate-500">{event.detail}</p>}
          <p className="text-xs text-slate-400">{formatRelativeTime(event.createdAt)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
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
