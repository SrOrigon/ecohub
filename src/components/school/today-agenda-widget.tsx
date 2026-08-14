import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sun, Calendar, ChevronRight } from "lucide-react";
import type { TodayItem } from "@/components/student/today-checklist";
import { cn } from "@/lib/utils";

type DayStatus = {
  label: string;
  isClassDay: boolean;
  hours: string | null;
} | null;

export function TodayAgendaWidget({
  items,
  dayStatus,
  title = "Hoje",
  subtitle,
  kidFriendly = false,
}: {
  items: TodayItem[];
  dayStatus?: DayStatus;
  title?: string;
  subtitle?: string;
  kidFriendly?: boolean;
}) {
  const pending = items.filter((i) => !i.done).length;

  return (
    <Card
      className={cn(
        kidFriendly
          ? "kid-card border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-[var(--surface)] to-indigo-50 dark:border-amber-800 dark:from-amber-950/30 dark:to-indigo-950/20"
          : "border-[var(--border)]"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className={`flex items-center gap-2 ${kidFriendly ? "text-xl" : "text-lg"}`}>
            <Sun className="h-5 w-5 text-amber-500" aria-hidden="true" />
            {title}
          </CardTitle>
          {dayStatus && (
            <Badge variant={dayStatus.isClassDay ? "success" : "secondary"}>
              {dayStatus.label}
              {dayStatus.hours ? ` · ${dayStatus.hours}` : ""}
            </Badge>
          )}
        </div>
        <p className={cn("text-[var(--muted-foreground)]", kidFriendly ? "text-base" : "text-sm")}>
          {subtitle ??
            (pending === 0 ? "Nada pendente para hoje." : `${pending} item(ns) na sua agenda`)}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
            <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
            Agenda livre  -  aproveite para revisar ou anotar lembretes!
          </div>
        ) : (
          items.slice(0, 6).map((item) => (
            <div key={item.id} className="agenda-item-row">
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-semibold text-[var(--foreground)]",
                    kidFriendly ? "text-base" : "text-sm"
                  )}
                >
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="text-xs text-[var(--muted-foreground)]">{item.subtitle}</p>
                )}
                {item.badge && (
                  <Badge variant="warning" className="mt-1">
                    {item.badge}
                  </Badge>
                )}
              </div>
              {!item.done && (
                <Link href={item.href}>
                  <Button size={kidFriendly ? "lg" : "sm"} variant="secondary" className="shrink-0 gap-1">
                    {item.cta}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              )}
            </div>
          ))
        )}
        <div className="flex flex-wrap justify-center gap-3 pt-1 text-sm">
          <Link href="/dashboard/agenda" className="font-medium text-[color:var(--school-primary)] hover:underline">
            Minha agenda
          </Link>
          {items.length > 6 && (
            <Link href="/dashboard/calendario" className="text-[color:var(--school-primary)] hover:underline">
              Calendário escolar
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
