"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { establishSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findSchoolBySlug } from "@/lib/school-lookup";
import { saveSchoolSlugPreference } from "@/actions/preferences";
import { getSchoolSettings } from "@/lib/school-settings";
import { verifyStudentPin } from "@/lib/student-pin";
import type { UserRole } from "@/lib/constants";
import {
  DEMO_ACCOUNTS,
  isDemoRoleKey,
  DEFAULT_DEMO_ROLE,
} from "@/lib/demo-accounts";
import { isDemoLoginEnabled } from "@/lib/demo-mode";

function dashboardForRole(role: UserRole) {
  switch (role) {
    case "student":
      return "/dashboard/aluno";
    case "teacher":
      return "/dashboard/professor";
    case "parent":
      return "/dashboard/responsavel";
    default:
      return "/dashboard";
  }
}

/** Login demo instantâneo — só em ambiente demo. */
export async function performDemoLogin(roleKey: string) {
  if (!isDemoLoginEnabled()) {
    redirect("/login?error=demo-indisponivel");
  }

  if (!isDemoRoleKey(roleKey)) {
    redirect("/demo/director");
  }

  const account = DEMO_ACCOUNTS[roleKey];

  if (account.type === "pin") {
    const school = await findSchoolBySlug(account.schoolSlug);
    if (!school) redirect("/login?error=demo-indisponivel");

    const settings = await getSchoolSettings(school.id);
    if (!settings.auth.allowStudentPinLogin) {
      redirect("/login?error=pin-desativado");
    }

    const student = await prisma.student.findFirst({
      where: {
        enrollmentCode: account.enrollmentCode,
        user: { schoolId: school.id, role: "student" },
      },
      include: { user: true },
    });

    if (!student?.accessPinHash) redirect("/login?error=demo-indisponivel");

    const valid = await verifyStudentPin(account.pin, student.accessPinHash);
    if (!valid) redirect("/login?error=demo-indisponivel");

    await saveSchoolSlugPreference(school.slug);
    await establishSession(student.user, { tenantSlug: school.slug });
    redirect("/dashboard/aluno");
  }

  const user = await prisma.user.findUnique({ where: { email: account.email } });
  if (!user || !(await bcrypt.compare(account.password, user.passwordHash))) {
    redirect("/login?error=demo-indisponivel");
  }

  const school = await findSchoolBySlug(account.tenantSlug);
  await establishSession(user, { tenantSlug: school?.slug ?? account.tenantSlug });
  redirect(dashboardForRole(user.role as UserRole));
}

export async function demoLoginAction(formData: FormData) {
  const role = String(formData.get("role") ?? DEFAULT_DEMO_ROLE);
  await performDemoLogin(role);
}
