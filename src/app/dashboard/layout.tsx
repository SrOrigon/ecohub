import { getSessionUser } from "@/lib/auth";
import { getSchool } from "@/lib/queries";
import { parseSchoolSettings } from "@/lib/school-settings";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SchoolVerificationBanner } from "@/components/school/school-verification-banner";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const school = await getSchool(user);
  const settings = parseSchoolSettings(school?.settings);

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
    >
      {(user.role === "admin" || user.role === "director") && school && (
        <SchoolVerificationBanner
          status={school.verificationStatus}
          legalName={school.legalName}
          cnpj={school.cnpj}
        />
      )}
      {children}
    </DashboardShell>
  );
}
