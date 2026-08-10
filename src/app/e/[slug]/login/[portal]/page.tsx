import { notFound } from "next/navigation";
import { findSchoolBySlug } from "@/lib/school-lookup";
import { TenantRoleLoginPage } from "@/components/auth/tenant-role-login-page";

const validPortals = ["escola", "professor", "aluno", "responsavel"] as const;
type Portal = (typeof validPortals)[number];

export default async function TenantRoleLoginRoute({
  params,
}: {
  params: Promise<{ slug: string; portal: string }>;
}) {
  const { slug, portal } = await params;
  if (!validPortals.includes(portal as Portal)) notFound();

  const school = await findSchoolBySlug(slug);
  if (!school) notFound();

  return (
    <main className="auth-page flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <TenantRoleLoginPage portal={portal as Portal} schoolSlug={school.slug} schoolName={school.name} />
    </main>
  );
}
