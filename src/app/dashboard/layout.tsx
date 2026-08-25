import { getSessionUser } from "@/lib/auth";
import { getSchool } from "@/lib/queries";
import { parseSchoolSettings } from "@/lib/school-settings";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { syncSchoolVerificationIfNeeded } from "@/lib/sync-school-verification";
import { SCHOOL_VERIFICATION_STATUS } from "@/lib/school-verification";
import { buildCreatorJourney } from "@/lib/creator-journey";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { isNextRedirect } from "@/lib/run-server-action";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const digest =
      typeof error === "object" && error && "digest" in error
        ? String((error as { digest?: string }).digest)
        : "";
    if (digest === "DYNAMIC_SERVER_USAGE") throw error;
    console.error("[dashboard] sessão:", error);
    redirect("/login");
  }
  if (!user) redirect("/login");

  let school = null;
  try {
    school = await getSchool(user);
  } catch (error) {
    console.error("[dashboard] escola:", error);
  }
  const settings = parseSchoolSettings(school?.settings);

  let creatorJourney = null;
  if (
    user.schoolId &&
    (user.role === "teacher" || user.role === "admin" || user.role === "director")
  ) {
    try {
      const [studentCount, trailCount, classCount] = await Promise.all([
        prisma.student.count({ where: { user: { schoolId: user.schoolId } } }),
        prisma.learningTrail.count({ where: { schoolId: user.schoolId } }),
        prisma.classGroup.count({ where: { schoolId: user.schoolId } }),
      ]);
      creatorJourney = buildCreatorJourney({
        hasClass: classCount > 0,
        hasStudents: studentCount > 0,
        hasTrail: trailCount > 0,
      });
    } catch (error) {
      console.error("[dashboard] jornada criador:", error);
    }
  }

  if (
    school &&
    (user.role === "admin" || user.role === "director") &&
    school.verificationStatus !== SCHOOL_VERIFICATION_STATUS.verified &&
    school.verificationStatus !== SCHOOL_VERIFICATION_STATUS.rejected
  ) {
    try {
      await syncSchoolVerificationIfNeeded(school);
    } catch (error) {
      console.error("[dashboard] verificação CNPJ:", error);
    }
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
      creatorJourney={creatorJourney}
      showPlatformAdmin={isPlatformAdmin(user.email)}
    >
      {children}
    </DashboardShell>
  );
}
