import { AuthPortalPicker } from "@/components/auth/auth-portal-picker";

export default function RegisterHubPage() {
  return (
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <AuthPortalPicker mode="register" />
    </main>
  );
}
