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
export const DEMO_TEACHER_EMAIL = "demo.professor@ecohub.temp";
export const DEMO_CLASS_NAME = "Turma Demo SAO";
export const DEMO_HOME_TASK_TITLE = "DEMO-SAO: Teste Congratulations!!";
export const DEMO_EXERCISE_PREFIX = "DEMO-SAO:";

const DEMO_EXERCISES = [
  {
    title: `${DEMO_EXERCISE_PREFIX} Verdadeiro ou falso`,
    description: "Responda e envie para ver a animação Congratulations!!",
    kind: "homework" as const,
    xpReward: 30,
    coinReward: 5,
    questions: [
      {
        prompt: "2 + 2 = 4?",
        type: "true_false",
        points: 1,
        options: [
          { id: "true", text: "Verdadeiro", isCorrect: true },
          { id: "false", text: "Falso", isCorrect: false },
        ],
      },
    ],
  },
  {
    title: `${DEMO_EXERCISE_PREFIX} Quiz rápido`,
    description: "Uma pergunta de múltipla escolha para testar.",
    kind: "homework" as const,
    xpReward: 40,
    coinReward: 8,
    questions: [
      {
        prompt: "Qual planeta é conhecido como Planeta Vermelho?",
        type: "choice",
        points: 1,
        options: [
          { id: "marte", text: "Marte", isCorrect: true },
          { id: "venus", text: "Vênus", isCorrect: false },
          { id: "jupiter", text: "Júpiter", isCorrect: false },
        ],
      },
    ],
  },
  {
    title: `${DEMO_EXERCISE_PREFIX} Flashcard SAO`,
    description: "Vire o card, marque se sabia e envie.",
    kind: "homework" as const,
    xpReward: 25,
    coinReward: 5,
    questions: [
      {
        prompt: "O que significa SAO no estilo da animação?",
        type: "flashcard",
        points: 1,
        options: [{ id: "back", text: "Sword Art Online — vitória épica!", isCorrect: true }],
      },
    ],
  },
];

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

async function ensureDemoTeacher(schoolId: string, passwordHash: string) {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_TEACHER_EMAIL },
    select: { id: true, schoolId: true },
  });

  if (existing) {
    if (existing.schoolId !== schoolId) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { schoolId, role: "teacher" },
      });
    }
    return existing.id;
  }

  const teacher = await prisma.user.create({
    data: {
      email: DEMO_TEACHER_EMAIL,
      passwordHash,
      fullName: "Professor Demo SAO",
      role: "teacher",
      schoolId,
    },
    select: { id: true },
  });
  return teacher.id;
}

async function ensureDemoClass(schoolId: string, teacherId: string) {
  const existing = await prisma.classGroup.findFirst({
    where: { schoolId, name: DEMO_CLASS_NAME },
    select: { id: true, teacherId: true },
  });

  if (existing) {
    if (existing.teacherId !== teacherId) {
      await prisma.classGroup.update({
        where: { id: existing.id },
        data: { teacherId },
      });
    }
    return existing.id;
  }

  const classGroup = await prisma.classGroup.create({
    data: {
      schoolId,
      name: DEMO_CLASS_NAME,
      gradeLevel: "Demo",
      year: new Date().getFullYear(),
      teacherId,
    },
    select: { id: true },
  });
  return classGroup.id;
}

async function ensureDemoExercises(schoolId: string, classId: string, teacherId: string, studentId: string) {
  const exerciseIds: string[] = [];

  for (const spec of DEMO_EXERCISES) {
    let exercise = await prisma.exercise.findFirst({
      where: { schoolId, classId, title: spec.title },
      select: { id: true },
    });

    if (!exercise) {
      exercise = await prisma.exercise.create({
        data: {
          schoolId,
          classId,
          teacherId,
          title: spec.title,
          description: spec.description,
          kind: spec.kind,
          maxPoints: spec.questions.reduce((sum, q) => sum + q.points, 0),
          xpReward: spec.xpReward,
          coinReward: spec.coinReward,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
          questions: {
            create: spec.questions.map((q, i) => ({
              prompt: q.prompt,
              type: q.type,
              points: q.points,
              sortOrder: i,
              options: JSON.stringify(q.options),
            })),
          },
        },
        select: { id: true },
      });
    }

    exerciseIds.push(exercise.id);

    await prisma.exerciseSubmission.deleteMany({
      where: { exerciseId: exercise.id, studentId },
    });
  }

  return exerciseIds;
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
  let classId: string;

  const teacherId = await ensureDemoTeacher(school.id, passwordHash);
  classId = await ensureDemoClass(school.id, teacherId);

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
        classId,
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
            classId,
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
  const exerciseIds = await ensureDemoExercises(school.id, classId, teacherId, studentId);

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
    exerciseIds,
    exercisesUrl: `${baseUrl}/dashboard/exercicios`,
    hint: "Em /dashboard/exercicios, responda um exercício DEMO-SAO para ver Congratulations!!",
  };
}

export async function removeDemoStudent(_databaseUrl?: string) {
  const demoUser = await prisma.user.findUnique({
    where: { email: DEMO_STUDENT_EMAIL },
    include: { student: true },
  });
  const demoParent = await prisma.user.findUnique({
    where: { email: DEMO_PARENT_EMAIL },
    select: { id: true },
  });

  let removedTasks = 0;
  let removedExercises = 0;

  if (demoUser?.student) {
    const deleted = await prisma.homeTask.deleteMany({
      where: { studentId: demoUser.student.id, title: DEMO_HOME_TASK_TITLE },
    });
    removedTasks = deleted.count;

    const demoExercises = await prisma.exercise.findMany({
      where: { title: { startsWith: DEMO_EXERCISE_PREFIX } },
      select: { id: true },
    });
    if (demoExercises.length > 0) {
      const ids = demoExercises.map((e) => e.id);
      await prisma.exerciseSubmission.deleteMany({ where: { exerciseId: { in: ids } } });
      const deletedEx = await prisma.exercise.deleteMany({ where: { id: { in: ids } } });
      removedExercises = deletedEx.count;
    }
  }

  const demoTeacher = await prisma.user.findUnique({
    where: { email: DEMO_TEACHER_EMAIL },
    select: { id: true },
  });

  const demoClass = await prisma.classGroup.findFirst({
    where: { name: DEMO_CLASS_NAME },
    select: { id: true },
  });

  if (demoUser) {
    await prisma.user.delete({ where: { id: demoUser.id } });
  }
  if (demoParent) {
    await prisma.user.delete({ where: { id: demoParent.id } });
  }
  if (demoClass) {
    await prisma.classGroup.delete({ where: { id: demoClass.id } }).catch(() => {});
  }
  if (demoTeacher) {
    await prisma.user.delete({ where: { id: demoTeacher.id } }).catch(() => {});
  }

  return {
    ok: true as const,
    removedStudent: !!demoUser,
    removedParent: !!demoParent,
    removedTasks,
    removedExercises,
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
  console.log(`  Exercícios: ${result.exercisesUrl} (${result.exerciseIds.length} disponíveis)`);
}
