import { StudentPinLoginForm } from "@/components/auth/student-pin-login-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function EntrarPage() {
  return (
    <AuthShell>
      <StudentPinLoginForm backHref="/login" emailLoginHref="/login/aluno" />
    </AuthShell>
  );
}
