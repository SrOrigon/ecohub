import { RoleLoginForm } from "@/components/auth/role-login-form";
import { getPreferenceCookies } from "@/actions/preferences";
import type { LoginPortal } from "@/lib/preference-cookies";

export async function RoleLoginPage({
  portal,
  tenantSlug,
  embedded = false,
}: {
  portal: LoginPortal;
  tenantSlug?: string;
  embedded?: boolean;
}) {
  const prefs = await getPreferenceCookies();

  const form = (
    <RoleLoginForm
      portal={portal}
      defaultEmail={prefs.rememberEmail ?? undefined}
      defaultRememberEmail={!!prefs.rememberEmail}
      tenantSlug={tenantSlug}
    />
  );

  if (embedded) return form;

  return (
    <main className="auth-page flex min-h-dvh items-center justify-center px-4 py-8">
      {form}
    </main>
  );
}
