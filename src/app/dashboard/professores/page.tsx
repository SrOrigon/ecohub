import { getSessionUser } from "@/lib/auth";
import { getTeachers } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeacherInvitesForSchool } from "@/actions/invites";
import { TeacherInvitePanel } from "@/components/invites/teacher-invite-panel";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { UserIdentity } from "@/components/profile/user-identity";
import { UserCog } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ProfessoresPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "director") redirect("/dashboard");

  const teachers = await getTeachers(user.schoolId);
  const invites = user.schoolId ? await getTeacherInvitesForSchool(user.schoolId) : [];

  const teachersWithClasses = await Promise.all(
    teachers.map(async (t) => {
      const classes = await prisma.classGroup.findMany({
        where: { teacherId: t.id },
        select: { name: true },
      });
      return { ...t, classes };
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Professores" description="Equipe docente da instituição" />

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
                <UserIdentity
                  name={teacher.fullName}
                  avatarUrl={teacher.avatarUrl}
                  subtitle={teacher.email}
                  size="md"
                />
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{teacher.classes.length} turma(s)</p>
                {teacher.classes.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {teacher.classes.map((c, i) => (
                      <li key={i} className="truncate">• {c.name}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
