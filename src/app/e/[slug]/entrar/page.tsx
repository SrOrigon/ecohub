import { notFound } from "next/navigation";
import { findSchoolBySlug } from "@/lib/school-lookup";
import { StudentPinLoginForm } from "@/components/auth/student-pin-login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { tenantLoginPath } from "@/lib/tenant";

export default async function TenantEntrarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = await findSchoolBySlug(slug);
  if (!school) notFound();

  return (
    <AuthShell>
      <StudentPinLoginForm
        schoolSlug={school.slug}
        schoolName={school.name}
        backHref={tenantLoginPath(slug)}
        emailLoginHref={`${tenantLoginPath(slug)}/aluno`}
      />
    </AuthShell>
  );
}
