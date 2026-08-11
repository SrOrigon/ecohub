"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  ClipboardList,
  RefreshCw,
  ShieldAlert,
  UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AttentionAlert, AttentionAlertKind, AttentionAlertSeverity } from "@/lib/attention-alerts";
import { useAttentionAlertsOptional } from "@/components/alerts/attention-alerts-provider";

const SEVERITY_LABELS: Record<AttentionAlertSeverity, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

const SEVERITY_VARIANT: Record<
  AttentionAlertSeverity,
  "danger" | "warning" | "default" | "secondary"
> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "secondary",
};

const KIND_ICONS: Record<AttentionAlertKind, typeof AlertTriangle> = {
  subject_grade: BookOpen,
  overall_grade: ClipboardList,
  attendance: UserX,
  absence_streak: UserX,
  exercise_deadline: CalendarClock,
  exercise_overdue: CalendarClock,
  mission_deadline: CalendarClock,
  occurrence: ShieldAlert,
};

function AlertRow({ alert, compact }: { alert: AttentionAlert; compact?: boolean }) {
  const Icon = KIND_ICONS[alert.kind];

  return (
    <Link href={alert.href} className="block">
      <div
        className={cn(
          "rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm",
          alert.severity === "critical" && "border-red-200 bg-red-50/40",
          compact && "p-3"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              alert.severity === "critical" || alert.severity === "high"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">{alert.title}</p>
              <Badge variant={SEVERITY_VARIANT[alert.severity]}>
                {SEVERITY_LABELS[alert.severity]}
              </Badge>
              {alert.deadlineLabel && (
                <Badge variant="secondary">{alert.deadlineLabel}</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-700">{alert.message}</p>
            {!compact && alert.detail && (
              <p className="mt-1 text-xs text-slate-500">{alert.detail}</p>
            )}
            {!compact && (
              <p className="mt-2 text-xs font-medium text-indigo-700">{alert.actionRequired}</p>
            )}
          </div>
          <span className="hidden shrink-0 text-sm text-indigo-600 sm:inline">Ver →</span>
        </div>
      </div>
    </Link>
  );
}

export function AttentionAlertsPanel({
  initialAlerts,
  studentId,
  title = "Monitoramento de atenção",
  description = "Alertas em tempo real sobre notas, faltas e prazos dos seus filhos.",
  compact = false,
  maxItems = 8,
  showEmpty = true,
  className,
}: {
  initialAlerts?: AttentionAlert[];
  studentId?: string;
  title?: string;
  description?: string;
  compact?: boolean;
  maxItems?: number;
  showEmpty?: boolean;
  className?: string;
}) {
  const live = useAttentionAlertsOptional();
  const alerts = live?.snapshot?.alerts ?? initialAlerts ?? [];
  const filtered = studentId ? alerts.filter((a) => a.studentId === studentId) : alerts;
  const visible = filtered.slice(0, maxItems);
  const urgentCount = filtered.filter(
    (a) => a.severity === "critical" || a.severity === "high"
  ).length;

  const statusLabel =
    live?.status === "live"
      ? "Monitoramento ao vivo"
      : live?.status === "polling"
        ? "Atualizando automaticamente"
        : live?.status === "connecting"
          ? "Conectando monitoramento"
          : null;

  if (visible.length === 0 && !showEmpty) return null;

  return (
    <Card className={cn("border-amber-200/80", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
              {title}
              {urgentCount > 0 && (
                <Badge variant="danger">{urgentCount} urgente{urgentCount > 1 ? "s" : ""}</Badge>
              )}
            </CardTitle>
            {!compact && <p className="mt-1 text-sm text-slate-600">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {statusLabel && (
              <Badge variant="secondary" className="gap-1">
                {live?.status === "live" && (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                )}
                {statusLabel}
              </Badge>
            )}
            {live && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void live.refresh()}
                aria-label="Atualizar alertas"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Nenhum alerta no momento. O monitoramento continua ativo 24h.
          </p>
        ) : (
          visible.map((alert) => <AlertRow key={alert.id} alert={alert} compact={compact} />)
        )}
        {filtered.length > maxItems && (
          <p className="text-center text-xs text-slate-500">
            + {filtered.length - maxItems} alerta(s) adicional(is)
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function AttentionAlertBadge({ href = "/dashboard/responsavel/alertas" }: { href?: string }) {
  const live = useAttentionAlertsOptional();
  const urgent =
    (live?.snapshot?.summary.critical ?? 0) + (live?.snapshot?.summary.high ?? 0);

  if (!live || urgent === 0) return null;

  return (
    <Link
      href={href}
      className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full border border-red-200 bg-red-50 transition hover:bg-red-100"
      aria-label={`${urgent} alerta(s) de atenção`}
      title={`${urgent} alerta(s) de atenção`}
    >
      <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
      <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
        {urgent > 9 ? "9+" : urgent}
      </span>
    </Link>
  );
}
