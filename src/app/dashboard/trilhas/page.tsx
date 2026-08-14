import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";
import { getTrailsForStudent } from "@/lib/trails";
import { PageHeader } from "@/components/layout/page-header";
import { CreateTrailForm } from "@/components/forms/create-trail-form";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { deleteTrailAction } from "@/actions/trails";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";

export default async function TrilhasPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const settings = await getSchoolSettings(user.schoolId);
  const isStaff = ["admin", "director", "teacher"].includes(user.role);
  const isStudent = user.role === "student";

  if (isStudent) {
    const student = await prisma.student.findUnique({ where: { userId: user.id } });
    if (!student) redirect("/dashboard");

    const trails = await getTrailsForStudent(student.id, student.classId, user.schoolId);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Trilhas de aprendizagem"
          description="Complete missões, exercícios e recompensas em sequência  -  como um jogo!"
        />
        {trails.length === 0 ? (
          <p className="text-slate-600">Nenhuma trilha disponível no momento.</p>
        ) : (
          <div className="grid gap-4">
            {trails.map((trail) => {
              const prog = trail.progress[0];
              const current = prog?.currentStep ?? 0;
              const done = !!prog?.completedAt;
              const total = trail.steps.length;
              const pct = total > 0 ? Math.round(((done ? total : current) / total) * 100) : 0;

              return (
                <Card key={trail.id} className={isStudent ? "kid-card border-2 border-indigo-100" : ""}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{trail.title}</CardTitle>
                      {done && <Badge variant="success">Concluída</Badge>}
                      {trail.classGroup && <Badge variant="secondary">{trail.classGroup.name}</Badge>}
                    </div>
                    {trail.description && <p className="text-sm text-slate-600">{trail.description}</p>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-[color:var(--school-primary)] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-600">
                      {done ? "Trilha completa!" : `Etapa ${Math.min(current + 1, total)} de ${total}`}
                      {" · "}+{trail.xpBonus + settings.trails.completionXpBonus} XP bônus
                    </p>
                    <ol className="space-y-2">
                      {trail.steps.map((step, i) => {
                        const stepDone = done || i < current;
                        const stepActive = !done && i === current;
                        const label =
                          step.title ??
                          step.mission?.title ??
                          step.exercise?.title ??
                          step.reward?.name ??
                          `Etapa ${i + 1}`;
                        const href =
                          step.stepType === "exercise" && step.exerciseId
                            ? `/dashboard/exercicios/${step.exerciseId}`
                            : step.stepType === "mission"
                              ? "/dashboard/aluno#missoes"
                              : "/dashboard/loja";

                        return (
                          <li
                            key={step.id}
                            className={`flex items-center gap-3 rounded-lg border p-3 ${
                              stepActive ? "border-[color:var(--school-primary-ring)] bg-[color:var(--school-primary-soft)]" : "border-slate-100"
                            }`}
                          >
                            {stepDone ? (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                            ) : (
                              <Circle className="h-5 w-5 shrink-0 text-slate-400" />
                            )}
                            <span className="flex-1 text-sm font-medium">{label}</span>
                            {stepActive && (
                              <Link href={href}>
                                <Button size="sm">Continuar</Button>
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!isStaff || !settings.trails.enabled) redirect("/dashboard");
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.createTrails")) {
    redirect("/dashboard");
  }

  const classFilter =
    user.role === "teacher" ? { schoolId: user.schoolId!, teacherId: user.id } : { schoolId: user.schoolId! };

  const [trails, missions, exercises, rewards, classes] = await Promise.all([
    prisma.learningTrail.findMany({
      where: { schoolId: user.schoolId! },
      include: {
        steps: { orderBy: { sortOrder: "asc" } },
        classGroup: { select: { name: true } },
        _count: { select: { progress: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mission.findMany({ where: { schoolId: user.schoolId!, isActive: true }, select: { id: true, title: true } }),
    prisma.exercise.findMany({ where: { schoolId: user.schoolId!, isActive: true }, select: { id: true, title: true } }),
    prisma.reward.findMany({ where: { schoolId: user.schoolId!, isActive: true }, select: { id: true, name: true } }),
    prisma.classGroup.findMany({ where: classFilter, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trilhas de aprendizagem"
        description="Encadeie missões, exercícios e recompensas em uma jornada gamificada."
      >
        <CreateTrailForm options={{ missions, exercises, rewards, classes }} />
      </PageHeader>

      <div className="grid gap-4">
        {trails.map((trail) => (
          <Card key={trail.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{trail.title}</CardTitle>
                  <Badge variant={trail.isActive ? "success" : "secondary"}>
                    {trail.isActive ? "Ativa" : "Inativa"}
                  </Badge>
                  {trail.classGroup && <Badge variant="secondary">{trail.classGroup.name}</Badge>}
                </div>
                <DeleteConfirmButton
                  label="Excluir trilha"
                  iconOnly
                  confirmMessage={`Excluir a trilha "${trail.title}"? Progresso dos alunos será perdido. Esta ação não pode ser desfeita.`}
                  hiddenFields={{ id: trail.id }}
                  action={deleteTrailAction}
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                {trail.steps.length} etapas · {trail._count.progress} aluno(s) em progresso
                {" · "}+{trail.xpBonus} XP bônus
              </p>
              <ol className="mt-3 flex flex-wrap gap-2">
                {trail.steps.map((s, i) => (
                  <Badge key={s.id} variant="secondary">
                    {i + 1}. {s.title ?? s.stepType}
                  </Badge>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
