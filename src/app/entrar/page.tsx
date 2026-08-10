import { StudentPinLoginForm } from "@/components/auth/student-pin-login-form";

export default function EntrarPage() {
  return (
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <StudentPinLoginForm backHref="/login" emailLoginHref="/login/aluno" />
    </main>
  );
}
