import { getSessionUser } from "@/lib/auth";
import { getSchool } from "@/lib/queries";
import { parseSchoolSettings } from "@/lib/school-settings";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { syncSchoolVerificationIfNeeded } from "@/lib/sync-school-verification";
import { SCHOOL_VERIFICATION_STATUS } from "@/lib/school-verification";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const school = await getSchool(user);
  const settings = parseSchoolSettings(school?.settings);

  if (
    school &&
    (user.role === "admin" || user.role === "director") &&
    school.verificationStatus !== SCHOOL_VERIFICATION_STATUS.verified &&
    school.verificationStatus !== SCHOOL_VERIFICATION_STATUS.rejected
  ) {
    await syncSchoolVerificationIfNeeded(school);
  }

  return (
    <DashboardShell
      userName={user.fullName}
      schoolName={school?.name ?? "Sem escola"}
      schoolSlug={school?.slug ?? null}
      role={user.role}
      avatarUrl={user.avatarUrl}
      branding={settings.branding}
      permissions={settings.permissions}
      features={{ trailsEnabled: settings.trails.enabled }}
      showPlatformAdmin={isPlatformAdmin(user.email)}
    >
      {children}
    </DashboardShell>
  );
}
