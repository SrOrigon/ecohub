import { getSessionUser } from "@/lib/auth";
import { fetchProfileData } from "@/lib/reads/profile-reads";
import { PageHeader } from "@/components/layout/page-header";
import { ProfilePageContent } from "@/components/profile/profile-page-content";
import { ROLE_LABELS, type UserRole } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function PerfilPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const profile = await fetchProfileData(sessionUser, sessionUser.id);
  if (!profile) redirect("/login");

  const role = profile.role as UserRole;

  const payload = {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role,
    avatarUrl: profile.avatarUrl,
    createdAt: profile.createdAt.toISOString(),
    createdAtLabel: formatDate(profile.createdAt),
    school: profile.school,
    student: profile.student,
    parentLinks: profile.parentLinks,
    taughtClasses: profile.taughtClasses,
    notificationCount: profile._count.notifications,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Minha conta"
        description="Gerencie seus dados pessoais, foto e senha de acesso"
      />
      <p className="sr-only">Perfil de {profile.fullName}, {ROLE_LABELS[role]}</p>
      <ProfilePageContent profile={payload} />
    </div>
  );
}
