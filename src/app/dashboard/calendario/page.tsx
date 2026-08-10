import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { fetchPersonalNotesForUser } from "@/lib/reads/personal-note-reads";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SchoolCalendarWidget } from "@/components/school/school-calendar-widget";
import { formatSchoolDays, getTodaySchoolStatus } from "@/lib/school-calendar";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { NotebookPen } from "lucide-react";

export default async function CalendarioPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [settings, notes] = await Promise.all([
    getSchoolSettings(user.schoolId),
    fetchPersonalNotesForUser(user, user.id),
  ]);
  const today = getTodaySchoolStatus(settings);
  const todayStr = new Date().toISOString().split("T")[0];
  const todayPersonalNotes = notes.filter((n) => n.date === todayStr);

  const allItems = [
    ...settings.calendar.holidays.map((h) => ({
      date: h.date,
      label: h.label,
      kind: "holiday" as const,
    })),
    ...settings.calendar.events.map((e) => ({
      date: e.date,
      label: e.label,
      kind: e.kind ?? ("event" as const),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário escolar"
        description={settings.branding.tagline || "Datas, horários e eventos da instituição"}
      >
        <Link href="/dashboard/agenda">
          <Button variant="outline" className="gap-2">
            <NotebookPen className="h-4 w-4" aria-hidden="true" />
            Minha agenda
          </Button>
        </Link>
        <a href="/api/calendar/ics">
          <Button variant="outline">Exportar ICS</Button>
        </a>
      </PageHeader>

      <div className="stat-grid">
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="stat-card-label">Status de hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-[var(--foreground)]">{today.label}</p>
            {today.hours && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Horário: {today.hours}</p>
            )}
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="stat-card-label">Período letivo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--foreground)]">
            <p>{formatDate(settings.calendar.yearStart)}</p>
            <p>até {formatDate(settings.calendar.yearEnd)}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="stat-card-label">Dias de aula</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-[var(--foreground)]">
              {formatSchoolDays(settings.calendar.schoolDays)}
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {settings.calendar.classStartTime} – {settings.calendar.classEndTime}
            </p>
          </CardContent>
        </Card>
      </div>

      {todayPersonalNotes.length > 0 && (
        <Card className="border-[color:var(--school-primary-ring)] bg-[color:var(--school-primary-soft)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Suas anotações de hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayPersonalNotes.map((note) => (
              <div key={note.id} className="rounded-lg bg-[var(--surface)] px-3 py-2 text-sm">
                <p className="font-semibold text-[var(--foreground)]">{note.title ?? "Anotação"}</p>
                <p className="text-[var(--muted-foreground)]">{note.content}</p>
              </div>
            ))}
            <Link href="/dashboard/agenda" className="inline-block text-sm font-medium text-[color:var(--school-primary)] hover:underline">
              Gerenciar na minha agenda →
            </Link>
          </CardContent>
        </Card>
      )}

      <SchoolCalendarWidget settings={settings} />

      <Card>
        <CardHeader>
          <CardTitle>Todos os feriados e eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {allItems.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">
              Nenhum item cadastrado. Configure em Configurações.
            </p>
          ) : (
            <ul className="space-y-2">
              {allItems.map((item, i) => (
                <li
                  key={`${item.date}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] py-3 text-sm last:border-0"
                >
                  <span className="font-medium text-[var(--foreground)]">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.kind === "holiday" ? "warning" : "default"}>
                      {item.kind === "holiday"
                        ? "Feriado"
                        : item.kind === "exam"
                          ? "Prova"
                          : item.kind === "meeting"
                            ? "Reunião"
                            : "Evento"}
                    </Badge>
                    <span className="text-[var(--muted-foreground)]">{formatDate(item.date)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
