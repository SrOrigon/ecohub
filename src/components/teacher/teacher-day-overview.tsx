import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Users } from "lucide-react";

export type TeacherClassDayItem = {
  id: string;
  name: string;
  studentCount: number;
  attendanceDone: boolean;
  pendingMissions: number;
  pendingSubmissions: number;
};

export function TeacherDayOverview({ classes }: { classes: TeacherClassDayItem[] }) {
  if (classes.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Suas turmas hoje</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {classes.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {c.studentCount} alunos
                  </p>
                </div>
                <Badge variant={c.attendanceDone ? "success" : "warning"}>
                  {c.attendanceDone ? "Chamada ok" : "Chamada pendente"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {c.pendingMissions > 0 && (
                  <Badge variant="default">{c.pendingMissions} missão(ões)</Badge>
                )}
                {c.pendingSubmissions > 0 && (
                  <Badge variant="warning">{c.pendingSubmissions} correção(ões)</Badge>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/dashboard/frequencia">
                  <Button size="sm" variant="outline" className="gap-1">
                    <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                    Chamada
                  </Button>
                </Link>
                <Link href="/dashboard/diario">
                  <Button size="sm" variant="ghost">Diário</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
