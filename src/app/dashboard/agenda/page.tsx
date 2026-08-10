import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { fetchPersonalNotesForUser } from "@/lib/reads/personal-note-reads";
import { PageHeader } from "@/components/layout/page-header";
import { PersonalNotesManager } from "@/components/notes/personal-notes-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SchoolCalendarWidget } from "@/components/school/school-calendar-widget";
import { getSchoolSettings } from "@/lib/school-settings";
import { redirect } from "next/navigation";
import { CalendarDays, Pin, StickyNote } from "lucide-react";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const [notes, settings] = await Promise.all([
    fetchPersonalNotesForUser(user, user.id),
    getSchoolSettings(user.schoolId),
  ]);

  const quickCount = notes.filter((n) => !n.date).length;
  const datedCount = notes.filter((n) => n.date).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minha agenda"
        description="Anotações rápidas e lembretes por dia — organize estudos, provas e tarefas do seu jeito."
      >
        <Link href="/dashboard/calendario">
          <Button variant="outline" className="gap-2">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Agenda compartilhada
          </Button>
        </Link>
      </PageHeader>

      <div className="stat-grid">
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="stat-card-label flex items-center gap-2">
              <Pin className="h-4 w-4" aria-hidden="true" />
              Anotações rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="stat-card-value">{quickCount}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="stat-card-label flex items-center gap-2">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Com data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="stat-card-value">{datedCount}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="stat-card-label flex items-center gap-2">
              <StickyNote className="h-4 w-4" aria-hidden="true" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="stat-card-value">{notes.length}</p>
          </CardContent>
        </Card>
      </div>

      <PersonalNotesManager notes={notes} initialDate={params.date} />

      <SchoolCalendarWidget settings={settings} />
    </div>
  );
}
