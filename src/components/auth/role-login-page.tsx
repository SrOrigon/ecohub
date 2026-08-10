import { RoleLoginForm } from "@/components/auth/role-login-form";
import { getPreferenceCookies } from "@/actions/preferences";
import type { LoginPortal } from "@/lib/preference-cookies";

export async function RoleLoginPage({ portal }: { portal: LoginPortal }) {
  const prefs = await getPreferenceCookies();

  return (
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      <RoleLoginForm
        portal={portal}
        defaultEmail={prefs.rememberEmail ?? undefined}
        defaultRememberEmail={!!prefs.rememberEmail}
      />
    </main>
  );
}
