import { AuthPortalPicker } from "@/components/auth/auth-portal-picker";

export default function LoginHubPage() {
  return (
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <AuthPortalPicker mode="login" />
    </main>
  );
}
