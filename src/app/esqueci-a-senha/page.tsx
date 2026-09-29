import { ForgotPasswordForm } from "./forgot-password-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function EsqueciSenhaPage() {
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
