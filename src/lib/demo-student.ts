import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { BCRYPT_ROUNDS } from "@/lib/security/constants";
import { normalizePassword } from "@/lib/security/password-policy";

export const DEMO_STUDENT_EMAIL = "demo.animacao@ecohub.temp";
export const DEMO_STUDENT_PASSWORD = "DemoSAO2026!";
export const DEMO_STUDENT_ENROLLMENT = "DEMO9001";
export const DEMO_STUDENT_PIN = "900142";
export const DEMO_STUDENT_NAME = "Aluno Demo SAO";
export const DEMO_PARENT_EMAIL = "demo.responsavel@ecohub.temp";
export const DEMO_HOME_TASK_TITLE = "DEMO-SAO: Teste Congratulations!!";

async function hashPassword(password: string) {
  return bcrypt.hash(normalizePassword(password), BCRYPT_ROUNDS);
}

async function hashPin(pin: string) {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

async function resolveSchool() {
  const slugHint = process.env.ECOHUB_DEMO_SCHOOL_SLUG?.trim();
  if (slugHint) {
    const bySlug = await prisma.school.findUnique({ where: { slug: slugHint } });
    if (bySlug) return bySlug;
  }

  const schools = await prisma.school.findMany({
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const orion = schools.find((s) => s.name.toUpperCase().includes("ORION"));
  if (orion) return orion;

  return schools[0] ?? null;
}

async function ensureDemoHomeTask(studentId: string, parentId: string) {
  const existing = await prisma.homeTask.findFirst({
    where: { studentId, title: DEMO_HOME_TASK_TITLE },
  });

  if (existing) {
    if (existing.status !== "pending") {
      await prisma.homeTask.update({
        where: { id: existing.id },
        data: { status: "pending", completedAt: null },
      });
    }
    return existing.id;
  }

  const task = await prisma.homeTask.create({
    data: {
      studentId,
      parentId,
      title: DEMO_HOME_TASK_TITLE,
      description: "Clique em Concluí! para ver a animação Congratulations!!",
      xpReward: 50,
      coinReward: 10,
      status: "pending",
    },
  });
  return task.id;
}

export async function ensureDemoStudent() {
  const school = await resolveSchool();
  if (!school) {
    return { ok: false as const, error: "Nenhuma escola encontrada no banco." };
  }

  const passwordHash = await hashPassword(DEMO_STUDENT_PASSWORD);
  const pinHash = await hashPin(DEMO_STUDENT_PIN);
  const parentPasswordHash = await hashPassword(DEMO_STUDENT_PASSWORD);

  let parent = await prisma.user.findUnique({
    where: { email: DEMO_PARENT_EMAIL },
    select: { id: true, schoolId: true },
  });

  if (!parent) {
    parent = await prisma.user.create({
      data: {
        email: DEMO_PARENT_EMAIL,
        passwordHash: parentPasswordHash,
        fullName: "Responsável Demo SAO",
        role: "parent",
        schoolId: school.id,
      },
      select: { id: true, schoolId: true },
    });
  } else if (parent.schoolId !== school.id) {
    await prisma.user.update({
      where: { id: parent.id },
      data: { schoolId: school.id },
    });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: DEMO_STUDENT_EMAIL },
    include: { student: true },
  });

  let studentId: string;

  if (existingUser?.student) {
    studentId = existingUser.student.id;
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        fullName: DEMO_STUDENT_NAME,
        schoolId: school.id,
        role: "student",
      },
    });
    await prisma.student.update({
      where: { id: studentId },
      data: {
        enrollmentCode: DEMO_STUDENT_ENROLLMENT,
        accessPinHash: pinHash,
        accountType: "standard",
        status: "active",
      },
    });
  } else {
    const created = await prisma.user.create({
      data: {
        email: DEMO_STUDENT_EMAIL,
        passwordHash,
        fullName: DEMO_STUDENT_NAME,
        role: "student",
        schoolId: school.id,
        student: {
          create: {
            enrollmentCode: DEMO_STUDENT_ENROLLMENT,
            birthDate: new Date("2012-06-15"),
            accessPinHash: pinHash,
            accountType: "standard",
            coins: 100,
            xpTotal: 0,
            level: 1,
          },
        },
      },
      include: { student: true },
    });
    studentId = created.student!.id;
  }

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId } },
    create: { parentId: parent.id, studentId, relation: "responsavel" },
    update: {},
  });

  const homeTaskId = await ensureDemoHomeTask(studentId, parent.id);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://eduhub-production-b513.up.railway.app";

  return {
    ok: true as const,
    created: !existingUser,
    school: { id: school.id, name: school.name, slug: school.slug },
    student: {
      email: DEMO_STUDENT_EMAIL,
      password: DEMO_STUDENT_PASSWORD,
      enrollmentCode: DEMO_STUDENT_ENROLLMENT,
      pin: DEMO_STUDENT_PIN,
      name: DEMO_STUDENT_NAME,
    },
    login: {
      emailPassword: `${baseUrl}/login/aluno`,
      pinPortal: `${baseUrl}/e/${school.slug}/entrar`,
      studentDashboard: `${baseUrl}/dashboard/aluno`,
    },
    homeTaskId,
    hint: "Em /dashboard/aluno, conclua a tarefa DEMO-SAO para ver Congratulations!!",
  };
}

export async function removeDemoStudent() {
  const demoUser = await prisma.user.findUnique({
    where: { email: DEMO_STUDENT_EMAIL },
    include: { student: true },
  });
  const demoParent = await prisma.user.findUnique({
    where: { email: DEMO_PARENT_EMAIL },
    select: { id: true },
  });

  let removedTasks = 0;
  if (demoUser?.student) {
    const deleted = await prisma.homeTask.deleteMany({
      where: { studentId: demoUser.student.id, title: DEMO_HOME_TASK_TITLE },
    });
    removedTasks = deleted.count;
  }

  if (demoUser) {
    await prisma.user.delete({ where: { id: demoUser.id } });
  }
  if (demoParent) {
    await prisma.user.delete({ where: { id: demoParent.id } });
  }

  return {
    ok: true as const,
    removedStudent: !!demoUser,
    removedParent: !!demoParent,
    removedTasks,
  };
}

export function logDemoCredentials(result: Awaited<ReturnType<typeof ensureDemoStudent>>) {
  if (!result.ok) return;
  console.log("[ecohub:demo] Conta demo pronta:");
  console.log(`  Escola: ${result.school.name} (${result.school.slug})`);
  console.log(`  E-mail: ${result.student.email}`);
  console.log(`  Senha:  ${result.student.password}`);
  console.log(`  Matrícula/PIN: ${result.student.enrollmentCode} / ${result.student.pin}`);
  console.log(`  Login: ${result.login.emailPassword}`);
}
