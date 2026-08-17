import { notFound } from "next/navigation";
import { findSchoolBySlug } from "@/lib/school-lookup";
import { AuthPortalPicker } from "@/components/auth/auth-portal-picker";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function TenantLoginHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = await findSchoolBySlug(slug);
  if (!school) notFound();

  return (
    <AuthShell wide>
      <AuthPortalPicker mode="login" tenantSlug={school.slug} schoolName={school.name} />
    </AuthShell>
  );
}
