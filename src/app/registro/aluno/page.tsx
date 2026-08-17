import { RegisterStudentForm } from "@/components/auth/register-student-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getPreferenceCookies } from "@/actions/preferences";

export default async function RegistroAlunoPage({
  searchParams,
}: {
  searchParams: Promise<{ escola?: string }>;
}) {
  const { escola } = await searchParams;
  const prefs = await getPreferenceCookies();
  const initialSlug = escola?.trim().toLowerCase() || prefs.lastSchoolSlug || "";

  return (
    <AuthShell>
      <RegisterStudentForm initialSchoolSlug={initialSlug} />
    </AuthShell>
  );
}
