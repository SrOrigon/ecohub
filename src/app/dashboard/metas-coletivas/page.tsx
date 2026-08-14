import { getSessionUser } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";
import { getClassGoalsForSchool } from "@/actions/class-goals";
import { getClassGoalProgress } from "@/lib/class-goals";
import { PageHeader } from "@/components/layout/page-header";
import { CreateClassGoalForm, CheckClassGoalButton } from "@/components/forms/create-class-goal-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CLASS_GOAL_LABELS, type ClassGoalMetric } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { deleteClassGoalAction } from "@/actions/class-goals";

export default async function MetasColetivasPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "director", "teacher"].includes(user.role)) redirect("/dashboard");

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.createClassGoals")) {
    redirect("/dashboard");
  }

  const teacherId = user.role === "teacher" ? user.id : undefined;
  const goals = await getClassGoalsForSchool(user.schoolId!, teacherId);

  const classFilter =
    user.role === "teacher" ? { schoolId: user.schoolId!, teacherId: user.id } : { schoolId: user.schoolId! };

  const classes = await prisma.classGroup.findMany({
    where: classFilter,
    select: { id: true, name: true },
  });

  const goalsWithProgress = await Promise.all(
    goals.map(async (g) => ({
      ...g,
      progress: await getClassGoalProgress(g.classId, g.metric as ClassGoalMetric),
    }))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas coletivas"
        description="Quando 80% da turma atinge a meta, todos ganham bônus de XP e moedas."
      >
        <CreateClassGoalForm
          classes={classes}
          defaults={{
            targetPercent: settings.classGoals.defaultTargetPercent,
            xpBonus: settings.classGoals.defaultXpBonus,
            coinBonus: settings.classGoals.defaultCoinBonus,
          }}
        />
      </PageHeader>

      <div className="grid gap-4">
        {goalsWithProgress.length === 0 ? (
          <p className="text-slate-600">Nenhuma meta coletiva criada.</p>
        ) : (
          goalsWithProgress.map((g) => (
            <Card key={g.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{g.title}</CardTitle>
                    <Badge variant="secondary">{g.classGroup.name}</Badge>
                    {g.awardedAt && <Badge variant="success">Bônus concedido</Badge>}
                  </div>
                  <DeleteConfirmButton
                    label="Excluir meta"
                    iconOnly
                    confirmMessage={`Excluir a meta "${g.title}"? Esta ação não pode ser desfeita.`}
                    hiddenFields={{ goalId: g.id }}
                    action={deleteClassGoalAction}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  {CLASS_GOAL_LABELS[g.metric as ClassGoalMetric]} · Meta: {g.targetPercent}%
                  {" · "}+{g.xpBonus} XP / +{g.coinBonus} moedas por aluno
                  {g.deadline && ` · Prazo: ${formatDate(g.deadline)}`}
                </p>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-[color:var(--school-primary)]"
                    style={{ width: `${Math.min(100, g.progress.percent)}%` }}
                  />
                </div>
                <p className="text-sm font-medium text-slate-800">
                  {g.progress.percent}% ({g.progress.completed}/{g.progress.total} alunos)
                </p>
                {!g.awardedAt && g.isActive && (
                  <CheckClassGoalButton classId={g.classId} />
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
