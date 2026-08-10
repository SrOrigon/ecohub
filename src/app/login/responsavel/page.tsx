import { RoleLoginForm } from "@/components/auth/role-login-form";

export default function LoginResponsavelPage() {
  return (
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <RoleLoginForm portal="responsavel" />
    </main>
  );
}
