import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";
import { getDiaryForClass, getOccurrencesForClass } from "@/actions/diary";
import { PageHeader } from "@/components/layout/page-header";
import { DiaryForms } from "@/components/forms/diary-forms";
import { ConfigureSubjectsPrompt } from "@/components/school/configure-subjects-prompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OCCURRENCE_LABELS, type OccurrenceKind } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function DiarioPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "director", "teacher"].includes(user.role)) redirect("/dashboard");

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.manageDiary")) {
    redirect("/dashboard");
  }

  const classFilter =
    user.role === "teacher" ? { schoolId: user.schoolId!, teacherId: user.id } : { schoolId: user.schoolId! };

  const classes = await prisma.classGroup.findMany({
    where: classFilter,
    include: { students: { include: { user: { select: { fullName: true } } } } },
    orderBy: { name: "asc" },
  });

  const classOptions = classes.map((c) => ({
    id: c.id,
    name: c.name,
    students: c.students.map((s) => ({ id: s.id, name: s.user.fullName })),
  }));

  const hasSubjects = settings.academic.subjects.length > 0;
  const canManageSettings = user.role === "admin" || user.role === "director";

  const firstClassId = classes[0]?.id;
  const [diary, occurrences] = firstClassId
    ? await Promise.all([
        getDiaryForClass(firstClassId, user.schoolId!),
        getOccurrencesForClass(firstClassId, user.schoolId!),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diário de classe"
        description="Registre conteúdo ministrado e ocorrências — integrado ao portal dos responsáveis."
      >
        <DiaryForms classes={classOptions} subjects={settings.academic.subjects} />
      </PageHeader>

      {!hasSubjects && (
        <ConfigureSubjectsPrompt
          canManage={canManageSettings}
          description="Registros gerais funcionam, mas para vincular conteúdo a uma matéria cadastre as disciplinas da instituição."
        />
      )}

      {classes.length === 0 ? (
        <p className="text-slate-600">Nenhuma turma disponível.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Últimos registros — {classes[0].name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {diary.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum registro ainda.</p>
              ) : (
                diary.map((d) => (
                  <div key={d.id} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{formatDate(d.date)}</Badge>
                      {d.subject && <Badge>{d.subject}</Badge>}
                    </div>
                    <p className="mt-2 text-sm text-slate-800">{d.content}</p>
                    <p className="mt-1 text-xs text-slate-500">{d.teacher.fullName}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ocorrências recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {occurrences.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma ocorrência.</p>
              ) : (
                occurrences.map((o) => (
                  <div key={o.id} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={o.kind === "positive" ? "success" : o.kind === "warning" ? "warning" : "secondary"}>
                        {OCCURRENCE_LABELS[o.kind as OccurrenceKind] ?? o.kind}
                      </Badge>
                      <span className="text-xs text-slate-500">{formatDate(o.date)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-800">{o.description}</p>
                    {o.student && (
                      <p className="mt-1 text-xs text-slate-500">Aluno: {o.student.user.fullName}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
