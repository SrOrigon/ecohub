import { getSessionUser } from "@/lib/auth";
import { getSchool } from "@/lib/queries";
import { parseSchoolSettings } from "@/lib/school-settings";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SchoolVerificationBanner } from "@/components/school/school-verification-banner";
import { syncSchoolVerificationIfNeeded } from "@/lib/sync-school-verification";
import { shouldShowVerificationBanner } from "@/lib/school-verification";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const school = await getSchool(user);
  const settings = parseSchoolSettings(school?.settings);

  let verificationStatus = school?.verificationStatus;
  if (school && shouldShowVerificationBanner(school.verificationStatus)) {
    verificationStatus = await syncSchoolVerificationIfNeeded(school);
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
      {(user.role === "admin" || user.role === "director") &&
        school &&
        verificationStatus &&
        shouldShowVerificationBanner(verificationStatus) && (
        <SchoolVerificationBanner
          status={verificationStatus}
          legalName={school.legalName}
          cnpj={school.cnpj}
        />
      )}
      {children}
    </DashboardShell>
  );
}
