"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { establishSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findSchoolBySlug } from "@/lib/school-lookup";
import { saveSchoolSlugPreference } from "@/actions/preferences";
import { getSchoolSettings } from "@/lib/school-settings";
import { hashStudentPin, verifyStudentPin } from "@/lib/student-pin";
import type { UserRole } from "@/lib/constants";
import {
  DEMO_ACCOUNTS,
  isDemoRoleKey,
  DEFAULT_DEMO_ROLE,
} from "@/lib/demo-accounts";
import { isDemoLoginEnabled } from "@/lib/demo-mode";

import { ensureDemoEnvironment } from "@/lib/ensure-demo-service";

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
    let school = await findSchoolBySlug(account.schoolSlug);
    if (!school) {
      await ensureDemoEnvironment();
      school = await findSchoolBySlug(account.schoolSlug);
    }
    if (!school) redirect("/login?error=demo-indisponivel");

    const settings = await getSchoolSettings(school.id);
    if (!settings.auth.allowStudentPinLogin) {
      redirect("/login?error=pin-desativado");
    }

    let student = await prisma.student.findFirst({
      where: {
        enrollmentCode: account.enrollmentCode,
        user: { schoolId: school.id, role: "student" },
      },
      include: { user: true },
    });

    if (!student?.accessPinHash) {
      await ensureDemoEnvironment();
      student = await prisma.student.findFirst({
        where: {
          enrollmentCode: account.enrollmentCode,
          user: { schoolId: school.id, role: "student" },
        },
        include: { user: true },
      });
    }

    if (!student?.accessPinHash) redirect("/login?error=demo-indisponivel");

    let valid = await verifyStudentPin(account.pin, student.accessPinHash);
    if (!valid) {
      const newPinHash = await hashStudentPin(account.pin);
      await prisma.student.update({
        where: { id: student.id },
        data: { accessPinHash: newPinHash },
      });
      valid = true;
    }
    if (!valid) redirect("/login?error=demo-indisponivel");

    await saveSchoolSlugPreference(school.slug);
    await establishSession(student.user, { tenantSlug: school.slug });
    redirect("/dashboard/aluno");
  }

  let user = await prisma.user.findUnique({ where: { email: account.email } });
  if (!user || !(await bcrypt.compare(account.password, user.passwordHash))) {
    await ensureDemoEnvironment();
    user = await prisma.user.findUnique({ where: { email: account.email } });
    if (user) {
      const valid = await bcrypt.compare(account.password, user.passwordHash);
      if (!valid) {
        const passwordHash = await bcrypt.hash(account.password, 10);
        user = await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash },
        });
      }
    }
  }

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
