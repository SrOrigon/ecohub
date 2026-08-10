import { AuthPortalPicker } from "@/components/auth/auth-portal-picker";
import { DemoQuickAccess } from "@/components/auth/demo-quick-access";

export default function LoginHubPage() {
  return (
    <main className="auth-page flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-8">
      <AuthPortalPicker mode="login" />
      <div className="w-full max-w-4xl">
        <DemoQuickAccess />
      </div>
    </main>
  );
}
