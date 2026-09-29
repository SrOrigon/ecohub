import { Suspense } from "react";

import { ResetPasswordForm } from "./reset-password-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function RedefinirSenhaPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div>Carregando...</div>}><ResetPasswordForm /></Suspense>
    </AuthShell>
  );
}
