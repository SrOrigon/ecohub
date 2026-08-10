import { RegisterStudentForm } from "@/components/auth/register-student-form";
import { getPreferenceCookies } from "@/actions/preferences";

export default async function RegistroAlunoPage() {
  const prefs = await getPreferenceCookies();
  return (
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <RegisterStudentForm initialSchoolSlug={prefs.lastSchoolSlug ?? ""} />
    </main>
  );
}
