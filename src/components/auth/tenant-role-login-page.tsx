import { RoleLoginPage } from "@/components/auth/role-login-page";
import type { LoginPortal } from "@/lib/preference-cookies";

export async function TenantRoleLoginPage({
  portal,
  schoolSlug,
  schoolName,
}: {
  portal: LoginPortal;
  schoolSlug: string;
  schoolName: string;
}) {
  return <RoleLoginPage portal={portal} tenantSlug={schoolSlug} schoolName={schoolName} />;
}
