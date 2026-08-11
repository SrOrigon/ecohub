import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SchoolSettings } from "@/lib/school-settings";
import {
  formatSchoolDays,
  getTodaySchoolStatus,
  getUpcomingCalendarItems,
} from "@/lib/school-calendar";
import { formatDate } from "@/lib/utils";
import { CalendarDays, ChevronRight, Clock } from "lucide-react";

export function SchoolCalendarWidget({
  settings,
  compact = false,
}: {
  settings: SchoolSettings;
  compact?: boolean;
}) {
  const today = getTodaySchoolStatus(settings);
  const upcoming = getUpcomingCalendarItems(settings, compact ? 3 : 8);

  return (
    <Card className={compact ? "border-[color:var(--school-primary-ring)]" : ""}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5 text-[color:var(--school-primary)]" aria-hidden="true" />
          Calendário compartilhado
        </CardTitle>
        <Link href="/dashboard/calendario">
          <Button variant="ghost" size="sm" className="gap-1">
            Ver tudo <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Hoje</p>
          <p className="text-lg font-bold text-slate-900">{today.label}</p>
          {today.hours && (
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Aulas: {today.hours}
            </p>
          )}
        </div>

        {!compact && (
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <p>
              <strong>Letivo:</strong>{" "}
              {formatDate(settings.calendar.yearStart)} – {formatDate(settings.calendar.yearEnd)}
            </p>
            <p>
              <strong>Dias de aula:</strong> {formatSchoolDays(settings.calendar.schoolDays)}
            </p>
          </div>
        )}

        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum feriado ou evento próximo.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((item, i) => (
              <li
                key={`${item.label}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <span>{item.label}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={item.kind === "holiday" ? "warning" : "default"}>
                    {item.kind === "holiday" ? "Feriado" : item.kind === "exam" ? "Prova" : "Evento"}
                  </Badge>
                  <span className="text-slate-500">{formatDate(item.date)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
