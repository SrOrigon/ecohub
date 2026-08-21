import { getSessionUser } from "@/lib/auth";
import { getTeachers } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { fetchTeacherInvitesForSchool } from "@/lib/reads/teacher-invite-reads";
import { TeacherInvitePanel } from "@/components/invites/teacher-invite-panel";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { UserIdentity } from "@/components/profile/user-identity";
import { formatUserLocation } from "@/lib/constants";
import { UserCog, MapPin } from "lucide-react";
import { redirect } from "next/navigation";
import { CreateTeacherForm } from "@/components/forms/create-teacher-form";
import { teacherClassWhere } from "@/lib/teacher-classes";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { deleteTeacherAction } from "@/actions/crud";

export default async function ProfessoresPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "director") redirect("/dashboard");

  const teachers = await getTeachers(user.schoolId);
  const invites = user.schoolId ? await fetchTeacherInvitesForSchool(user, user.schoolId).catch(() => []) : [];

  const teachersWithClasses = await Promise.all(
    teachers.map(async (t) => {
      try {
        const classes = user.schoolId ? await prisma.classGroup.findMany({
          where: { schoolId: user.schoolId, ...teacherClassWhere(t.id) },
          select: { name: true },
        }) : [];
        return { ...t, classes, location: formatUserLocation(t.city, t.state) };
      } catch {
        return { ...t, classes: [], location: formatUserLocation(t.city, t.state) };
      }
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Professores" description="Equipe docente da instituição">
        <CreateTeacherForm />
      </PageHeader>

      <TeacherInvitePanel invites={invites} />

      {teachers.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Nenhum professor cadastrado"
          description='Clique em "+ Novo professor" para adicionar.'
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teachersWithClasses.map((teacher) => (
            <Card key={teacher.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <UserIdentity
                    name={teacher.fullName}
                    avatarUrl={teacher.avatarUrl}
                    subtitle={teacher.email}
                    size="md"
                  />
                  <DeleteConfirmButton
                    label="Excluir"
                    iconOnly
                    confirmMessage={`Excluir o professor ${teacher.fullName}? Turmas ficarão sem titular e exercícios dele serão removidos. Esta ação não pode ser desfeita.`}
                    hiddenFields={{ teacherId: teacher.id }}
                    action={deleteTeacherAction}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {teacher.location && (
                  <p className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden="true" />
                    <span>{teacher.location}</span>
                  </p>
                )}
                <div>
                  <p className="text-sm font-medium">{teacher.classes.length} turma(s)</p>
                  {teacher.classes.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                      {teacher.classes.map((c, i) => (
                        <li key={i} className="truncate">
                          • {c.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
