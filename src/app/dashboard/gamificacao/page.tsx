import { Clock, Star, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMissions, getBadges, getRanking, getStudents } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateMissionForm } from "@/components/forms/create-mission-form";
import { EditMissionForm } from "@/components/forms/edit-mission-form";
import { StaffCompleteMissionForm } from "@/components/forms/staff-complete-mission-form";
import { CreateBadgeForm } from "@/components/forms/create-badge-form";
import { EditBadgeForm } from "@/components/forms/edit-badge-form";
import { PurgeDefaultBadgesButton } from "@/components/forms/purge-default-badges-button";
import { AwardBadgeForm } from "@/components/forms/award-badge-form";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getClasses } from "@/lib/queries";
import { getSchoolSettings } from "@/lib/school-settings";
import { RankingList } from "@/components/profile/ranking-list";
import { LiveStatsStrip, LiveActivityFeed } from "@/components/metrics/live-activity-feed";
import { BulkCompleteMissionsForm } from "@/components/forms/bulk-complete-missions-form";
import { AdjustStudentPointsForm } from "@/components/forms/adjust-student-points-form";
import { getPendingMissionConfirmations } from "@/lib/mission-requests";
import { hasPermission } from "@/lib/permissions";

import { requirePageAccess } from "@/lib/access-control";

const iconMap = { clock: Clock, star: Star, target: Target };

export default async function GamificacaoPage() {
  const user = await requirePageAccess(["admin", "director", "secretary", "teacher"]);

  const teacherFilter = user.role === "teacher" ? user.id : undefined;

  const [missions, badges, ranking, classes, students, settings, pendingMissions] = await Promise.all([
    getMissions(user.schoolId),
    getBadges(user.schoolId, teacherFilter),
    getRanking(user.schoolId),
    getClasses(user.schoolId, teacherFilter),
    getStudents(user.schoolId),
    getSchoolSettings(user.schoolId),
    user.schoolId ? getPendingMissionConfirmations(user.schoolId, teacherFilter) : Promise.resolve([]),
  ]);

  const pendingItems = pendingMissions.map((pm) => ({
    studentId: pm.studentId,
    missionId: pm.missionId,
    studentName: pm.student.user.fullName,
    className: pm.student.classGroup?.name ?? null,
    missionTitle: pm.mission.title,
    xpReward: pm.mission.xpReward,
    coinReward: pm.mission.coinReward,
  }));

  const classOptions = classes.map((c) => ({ id: c.id, name: c.name }));
  const isStaff = user.role === "director" || user.role === "secretary" || user.role === "teacher" || user.role === "admin";
  const requireBadgeClass = user.role === "teacher";
  const canAdjustPoints =
    user.role === "admin" ||
    user.role === "director" ||
    user.role === "secretary" ||
    (user.role === "teacher" && hasPermission(user.role, settings, "teacher.adjustPoints"));

  const adjustStudents = students.map((s) => ({
    id: s.id,
    name: s.user.fullName,
    className: s.classGroup?.name ?? null,
  }));

  function studentsForMission(classId: string | null) {
    const pool = classId
      ? students.filter((student) => {
          if (student.classId === classId) return true;
          return student.classEnrollments?.some(
            (enrollment) =>
              enrollment.classId === classId &&
              (enrollment.status === "active" || enrollment.status === "locked")
          );
        })
      : students;
    return pool.map((s) => ({
      id: s.id,
      name: s.user.fullName,
      completed: false,
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Gamificação" description="Missões, XP, atitudes por turma e rankings">
        {isStaff && (
          <div className="flex flex-wrap gap-2">
            <CreateBadgeForm classes={classOptions} requireClass={requireBadgeClass} />
            <CreateMissionForm
              classes={classOptions}
              defaultXp={settings.missions.defaultXp}
              defaultCoins={settings.missions.defaultCoins}
            />
            <PurgeDefaultBadgesButton />
          </div>
        )}
      </PageHeader>

      <LiveStatsStrip />

      {canAdjustPoints && adjustStudents.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/40">
          <CardHeader>
            <CardTitle>Pontos em atividade de sala</CardTitle>
            <CardDescription>
              Ajuste manual de XP e moedas por participação, comportamento ou atividades em sala.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdjustStudentPointsForm students={adjustStudents} />
          </CardContent>
        </Card>
      )}

      {isStaff && pendingItems.length > 0 && (
        <Card className="border-indigo-200 dark:border-indigo-900">
          <CardHeader>
            <CardTitle>Confirmações pendentes</CardTitle>
            <CardDescription>Alunos pediram confirmação de missões concluídas</CardDescription>
          </CardHeader>
          <CardContent>
            <BulkCompleteMissionsForm items={pendingItems} />
          </CardContent>
        </Card>
      )}

      {badges.length === 0 ? (
        <div className="space-y-3">
          <EmptyState
            icon={Star}
            title="Nenhuma atitude cadastrada"
            description={
              requireBadgeClass
                ? "Crie atitudes da sua turma para aplicá-las aos alunos nas aulas. Elas não se misturam com as de outros professores."
                : "Crie atitudes vinculadas a uma turma (ou da escola) e aplique-as aos alunos individualmente."
            }
          />
          {isStaff && <CreateBadgeForm classes={classOptions} requireClass={requireBadgeClass} />}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Atitudes</h2>
              <p className="text-sm text-slate-500">
                Cada atitude pertence a uma turma. Aplique ao aluno na aula — as da sua turma não aparecem nas do outro professor.
              </p>
            </div>
            {isStaff && <CreateBadgeForm classes={classOptions} requireClass={requireBadgeClass} />}
          </div>
          <div className="responsive-grid">
          {badges.map((badge) => {
            const Icon = iconMap[badge.icon as keyof typeof iconMap] ?? Star;
            const earnedIds = new Set(badge.studentBadges.map((sb) => sb.studentId));
            const eligibleStudents = studentsForMission(badge.classId).map((s) => ({
              ...s,
              earned: earnedIds.has(s.id),
            }));
            const isHighTier = badge.xpRequired >= 500;
            const isMidTier = badge.xpRequired >= 250;

            return (
              <div
                key={badge.id}
                className="achievement-card flex flex-col justify-between p-5 border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-sm hover:shadow-md"
              >
                <div>
                  {/* Top row: Icon + Tier XP Pill + Actions */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className={cn(
                        "achievement-icon-wrapper shrink-0",
                        isHighTier
                          ? "bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                          : isMidTier
                          ? "bg-gradient-to-br from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400"
                          : "bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "glass-pill",
                          isHighTier && "border-amber-400/40 bg-amber-50/80 text-amber-700 dark:text-amber-300 dark:bg-amber-950/50",
                          isMidTier && !isHighTier && "border-purple-400/40 bg-purple-50/80 text-purple-700 dark:text-purple-300 dark:bg-purple-950/50"
                        )}
                      >
                        +{badge.xpRequired} XP
                      </span>
                      {isStaff && (
                        <EditBadgeForm
                          badge={badge}
                          classes={classOptions}
                          requireClass={requireBadgeClass}
                          compact
                        />
                      )}
                    </div>
                  </div>

                  {/* Title and Scope */}
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                      {badge.name}
                    </h3>
                    {badge.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {badge.description}
                      </p>
                    )}
                  </div>

                  {/* Meta info: Class and Students badge */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 font-medium text-slate-600 dark:text-slate-300">
                      {badge.classGroup?.name ? `Turma: ${badge.classGroup.name}` : "Toda a escola"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 font-medium text-indigo-700 dark:text-indigo-300">
                      <Users className="h-3 w-3" />
                      {badge._count.studentBadges} {badge._count.studentBadges === 1 ? "aluno" : "alunos"}
                    </span>
                  </div>
                </div>

                {/* Actions / Award form */}
                {isStaff && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <AwardBadgeForm badgeId={badge.id} students={eligibleStudents} />
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}

      <div className="grid min-w-0 gap-6 md:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Missões ({missions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {missions.length === 0 && (
              <EmptyState
                icon={Target}
                title="Nenhuma missão criada"
                description="Crie missões para engajar os alunos com XP e moedas."
              />
            )}
            {missions.map((mission) => {
              const completions = mission.studentMissions.filter((sm) => sm.completedAt).length;
              const eligibleStudents = studentsForMission(mission.classId).map((s) => ({
                ...s,
                completed: mission.studentMissions.some(
                  (sm) => sm.studentId === s.id && sm.completedAt
                ),
              }));

              return (
                <div
                  key={mission.id}
                  className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-4 transition-all duration-150 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{mission.title}</p>
                      <p className="mt-1 text-sm text-slate-500 leading-relaxed">{mission.description}</p>
                      {mission.classGroup && (
                        <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          Turma: {mission.classGroup.name}
                        </p>
                      )}
                    </div>
                    {mission.isActive ? (
                      <Badge variant="success">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="default">+{mission.xpReward} XP</Badge>
                    <Badge variant="warning">+{mission.coinReward} moedas</Badge>
                    <span className="text-xs font-medium text-slate-500">
                      {completions} {completions === 1 ? "conclusão" : "conclusões"}
                    </span>
                  </div>
                  {isStaff && (
                    <div className="mt-3 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <EditMissionForm mission={mission} classes={classOptions} />
                      {mission.isActive && (
                        <StaffCompleteMissionForm missionId={mission.id} students={eligibleStudents} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Ranking geral</CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <EmptyState title="Ranking vazio" description="Cadastre alunos para ver o ranking." />
            ) : (
              <RankingList items={ranking} />
            )}
          </CardContent>
        </Card>
      </div>

      <LiveActivityFeed maxItems={10} />
    </div>
  );
}
