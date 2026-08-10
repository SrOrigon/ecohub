import { notFound } from "next/navigation";
import { findSchoolBySlug } from "@/lib/school-lookup";
import { StudentPinLoginForm } from "@/components/auth/student-pin-login-form";
import { tenantLoginPath } from "@/lib/tenant";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TenantEntrarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = await findSchoolBySlug(slug);
  if (!school) notFound();

  return (
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-4">
        <StudentPinLoginForm
          schoolSlug={school.slug}
          schoolName={school.name}
          backHref={tenantLoginPath(slug)}
          emailLoginHref={`${tenantLoginPath(slug)}/aluno`}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Outros acessos — {school.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 text-sm">
            <Link href={`${tenantLoginPath(slug)}/professor`} className="text-indigo-600 hover:underline">
              Professor
            </Link>
            <Link href={`${tenantLoginPath(slug)}/responsavel`} className="text-indigo-600 hover:underline">
              Responsável
            </Link>
            <Link href={`${tenantLoginPath(slug)}/escola`} className="text-indigo-600 hover:underline">
              Instituição
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
