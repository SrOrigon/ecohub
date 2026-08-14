import Link from "next/link";
import { Users, BookOpen, Home } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { fetchParentChildren } from "@/lib/reads/parent-reads";
import { getHomeTasksForParent } from "@/actions/home-tasks";
import { ProvisionStudentForm } from "@/components/parents/provision-student-form";
import { LinkChildForm } from "@/components/parents/link-child-form";
import { ParentAiTipsPanel } from "@/components/ai/parent-ai-tips-panel";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { UserIdentity } from "@/components/profile/user-identity";
import { CreateHomeTaskForm } from "@/components/forms/create-home-task-form";
import { ParentHomeTasksPanel } from "@/components/home-tasks/parent-home-tasks-panel";
import { AttentionAlertsPanel } from "@/components/alerts/attention-alerts-panel";
import { getAttentionAlertsSnapshot } from "@/lib/attention-alerts";
import { redirect } from "next/navigation";

const relationLabels: Record<string, string> = {
  mae: "Mãe",
  pai: "Pai",
  responsavel: "Responsável",
  avo: "Avô/Avó",
};

export default async function ResponsavelPortalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login/responsavel");
  if (user.role !== "parent") redirect("/dashboard");

  const [children, homeTasks, classes, settings, alertsSnapshot] = await Promise.all([
    fetchParentChildren(user, user.id),
    getHomeTasksForParent(user.id),
    user.schoolId
      ? prisma.classGroup.findMany({
          where: { schoolId: user.schoolId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    user.schoolId ? getSchoolSettings(user.schoolId) : null,
    getAttentionAlertsSnapshot(user),
  ]);

  const passGrade = settings?.academic.passGrade ?? 6;
  const assistantName = settings?.ai.assistantName ?? "Ecohub IA";
  const aiEnabled = settings?.ai.enabled !== false;

  const pendingByStudent =
    children.length > 0
      ? await prisma.exerciseSubmission.groupBy({
          by: ["studentId"],
          where: {
            studentId: { in: children.map((c) => c.student.id) },
            status: { in: ["pending", "submitted"] },
          },
          _count: { id: true },
        })
      : [];
  const pendingMap = new Map(pendingByStudent.map((p) => [p.studentId, p._count.id]));

  const childSummaries = children.map(({ student }) => {
    const avg =
      student.grades.length > 0
        ? student.grades.reduce((s, g) => s + g.value, 0) / student.grades.length
        : passGrade;
    const present = student.attendance.filter(
      (a) => a.status === "present" || a.status === "late"
    ).length;
    const freqRate =
      student.attendance.length > 0 ? Math.round((present / student.attendance.length) * 100) : 100;
    return {
      id: student.id,
      name: student.user.fullName,
      avgGrade: avg,
      freqRate,
      pendingExercises: pendingMap.get(student.id) ?? 0,
    };
  });

  const childOptions = children.map(({ student }) => ({
    id: student.id,
    name: student.user.fullName,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${user.fullName.split(" ")[0]}!`}
        description="Portal do responsável  -  acompanhe seus filhos e crie tarefas de casa"
      >
        {childOptions.length > 0 && <CreateHomeTaskForm childOptions={childOptions} />}
      </PageHeader>

      {aiEnabled && childSummaries.length > 0 && (
        <ParentAiTipsPanel
          childSummaries={childSummaries}
          passGrade={passGrade}
          assistantName={assistantName}
        />
      )}

      {children.length > 0 && (
        <AttentionAlertsPanel
          initialAlerts={alertsSnapshot.alerts}
          compact
          maxItems={5}
          title="Alertas de atenção monitorados"
          description="Problemas em matérias, faltas e prazos  -  atualização contínua."
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <LinkChildForm />
        <ProvisionStudentForm classes={classes} />
      </div>

      {childOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-violet-600" aria-hidden="true" />
              Tarefas de casa da família
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ParentHomeTasksPanel tasks={homeTasks} />
          </CardContent>
        </Card>
      )}

      {children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum filho vinculado"
          description="Vincule um filho já matriculado pela matrícula ou cadastre um menor para receber PIN de acesso."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {children.map(({ student, relation }) => {
            const avg =
              student.grades.length > 0
                ? student.grades.reduce((s, g) => s + g.value, 0) / student.grades.length
                : 0;
            const present = student.attendance.filter(
              (a) => a.status === "present" || a.status === "late"
            ).length;
            const freqRate =
              student.attendance.length > 0
                ? Math.round((present / student.attendance.length) * 100)
                : 0;

            return (
              <Card key={student.id}>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <UserIdentity
                      name={student.user.fullName}
                      avatarUrl={student.user.avatarUrl}
                      subtitle={`${relationLabels[relation] ?? relation} · ${student.classGroup?.name ?? "Sem turma"}`}
                      size="md"
                      className="flex-1"
                    />
                    <Link href={`/dashboard/responsavel/filho/${student.id}`} className="w-full sm:w-auto">
                      <Button size="sm" variant="outline" className="w-full sm:w-auto">
                        Ver detalhes
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="stat-grid gap-2 text-center">
                    <div className="rounded-lg bg-indigo-50 p-2">
                      <p className="text-xs text-slate-500">Média</p>
                      <p className="font-bold text-indigo-700">{avg.toFixed(1)}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2">
                      <p className="text-xs text-slate-500">Frequência</p>
                      <p className="font-bold text-emerald-700">{freqRate}%</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2">
                      <p className="text-xs text-slate-500">Nível / XP</p>
                      <p className="font-bold text-amber-700">Nv.{student.level}</p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1 text-sm font-medium">
                      <BookOpen className="h-4 w-4" aria-hidden="true" /> Últimas notas
                    </p>
                    <ul className="space-y-1 text-sm">
                      {student.grades.slice(0, 3).map((g) => (
                        <li key={g.id} className="flex justify-between gap-2">
                          <span className="truncate">{g.subject}</span>
                          <Badge variant={g.value >= 7 ? "success" : "warning"}>{g.value.toFixed(1)}</Badge>
                        </li>
                      ))}
                      {student.grades.length === 0 && (
                        <li className="text-slate-500">Sem notas lançadas</li>
                      )}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/alunos/${student.id}/boletim`}>
                      <Button size="sm" variant="outline">Boletim</Button>
                    </Link>
                    <Link href={`/dashboard/responsavel/filho/${student.id}`}>
                      <Button size="sm" variant="ghost">Missões e resgates</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Atalhos por filho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {children.map(({ student }) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="font-medium text-slate-900">{student.user.fullName}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/responsavel/filho/${student.id}`}>
                      <Button size="sm" variant="outline">Detalhes</Button>
                    </Link>
                    <Link href={`/dashboard/alunos/${student.id}/boletim`}>
                      <Button size="sm" variant="ghost">Boletim</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
