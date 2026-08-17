import { RoleLoginForm } from "@/components/auth/role-login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getPreferenceCookies } from "@/actions/preferences";
import type { LoginPortal } from "@/lib/preference-cookies";

export async function RoleLoginPage({
  portal,
  tenantSlug,
  schoolName,
}: {
  portal: LoginPortal;
  tenantSlug?: string;
  schoolName?: string;
}) {
  const prefs = await getPreferenceCookies();

  return (
    <AuthShell>
      <RoleLoginForm
        portal={portal}
        defaultEmail={prefs.rememberEmail ?? undefined}
        defaultRememberEmail={!!prefs.rememberEmail}
        tenantSlug={tenantSlug}
        schoolName={schoolName}
      />
    </AuthShell>
  );
}
