"use client";

import { Radio, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveMetricsOptional } from "@/components/metrics/live-metrics-provider";

export function LiveConnectionBadge({ className }: { className?: string }) {
  const ctx = useLiveMetricsOptional();
  if (!ctx) return null;

  const { status, lastUpdated, refresh } = ctx;

  const config = {
    live: {
      label: "Sincronizado",
      dot: "bg-emerald-500",
      icon: Radio,
      text: "text-emerald-700",
      border: "border-emerald-200 bg-emerald-50",
    },
    updating: {
      label: "Atualizando",
      dot: "bg-amber-500 animate-pulse",
      icon: RefreshCw,
      text: "text-amber-700",
      border: "border-amber-200 bg-amber-50",
    },
    connecting: {
      label: "Conectando",
      dot: "bg-slate-400",
      icon: RefreshCw,
      text: "text-slate-600",
      border: "border-slate-200 bg-slate-50",
    },
    offline: {
      label: "Offline",
      dot: "bg-red-500",
      icon: WifiOff,
      text: "text-red-700",
      border: "border-red-200 bg-red-50",
    },
  }[status];

  const Icon = config.icon;
  const timeLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
      <button
        type="button"
        onClick={() => void refresh()}
        title={timeLabel ? `Última atualização: ${timeLabel}. Clique só se precisar forçar.` : "Atualizar métricas"}
        aria-label={config.label}
        className={cn(
          "hidden touch-manipulation items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition hover:opacity-90 md:inline-flex",
          config.border,
          config.text,
          className
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", config.dot)} aria-hidden="true" />
        <Icon className="h-3 w-3" aria-hidden="true" />
        <span>{config.label}</span>
      </button>
  );
}
