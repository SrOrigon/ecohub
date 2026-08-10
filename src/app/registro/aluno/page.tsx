import { RegisterStudentForm } from "@/components/auth/register-student-form";
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
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <RegisterStudentForm initialSchoolSlug={initialSlug} />
    </main>
  );
}
