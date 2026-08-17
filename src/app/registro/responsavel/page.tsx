import { RegisterParentForm } from "@/components/auth/register-parent-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getPreferenceCookies } from "@/actions/preferences";

export default async function RegisterResponsavelPage({
  searchParams,
}: {
  searchParams: Promise<{ escola?: string }>;
}) {
  const { escola } = await searchParams;
  const prefs = await getPreferenceCookies();
  const initialSlug = escola?.trim().toLowerCase() || prefs.lastSchoolSlug || "";

  return (
    <AuthShell>
      <RegisterParentForm initialSchoolSlug={initialSlug} />
    </AuthShell>
  );
}
