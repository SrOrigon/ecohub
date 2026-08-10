import Link from "next/link";
import { getPreferenceCookies } from "@/actions/preferences";
import { RoleLoginForm } from "@/components/auth/role-login-form";
import { tenantEntrarPath, tenantLoginPath } from "@/lib/tenant";
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
  const prefs = await getPreferenceCookies();

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <p className="text-sm font-medium text-[var(--foreground)]">{schoolName}</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Código: <span className="font-mono">{schoolSlug}</span>
        </p>
      </div>
      <RoleLoginForm
        portal={portal}
        defaultEmail={prefs.rememberEmail ?? undefined}
        defaultRememberEmail={!!prefs.rememberEmail}
        tenantSlug={schoolSlug}
      />
      <div className="mx-auto flex max-w-lg flex-wrap justify-center gap-3 text-xs text-[var(--muted-foreground)]">
        <Link href={tenantLoginPath(schoolSlug)} className="hover:text-indigo-600 hover:underline">
          Trocar tipo de acesso
        </Link>
        {portal === "aluno" && (
          <Link href={tenantEntrarPath(schoolSlug)} className="hover:text-indigo-600 hover:underline">
            Entrar com matrícula e PIN
          </Link>
        )}
        <Link href="/login" className="hover:text-indigo-600 hover:underline">
          Login global
        </Link>
      </div>
    </div>
  );
}
