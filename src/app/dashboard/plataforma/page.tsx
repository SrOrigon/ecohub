import { getSessionUser } from "@/lib/auth";
import { fetchPendingSchoolsForPlatform } from "@/actions/platform";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { PlatformSchoolsPanel } from "@/components/platform/platform-schools-panel";
import { PlatformResetUserForm } from "@/components/platform/platform-reset-user-form";
import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "next/navigation";

export default async function PlataformaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isPlatformAdmin(user.email)) redirect("/dashboard");

  const schools = await fetchPendingSchoolsForPlatform(user.email);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administração da plataforma"
        description="Escolas com verificação pendente ou consulta à Receita indisponível."
      />
      <PlatformResetUserForm />
      <PlatformSchoolsPanel schools={schools} />
    </div>
  );
}
