/**
 * Garante contas demo sem apagar dados existentes — seguro em produção.
 * Senha demo: demo123 · PIN Lucas: matrícula 2026001 / 123456
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ensureDefaultBadges, ensureDefaultRewards } from "../src/lib/school-setup";
import { hashStudentPin } from "../src/lib/student-pin";
import { parseSchoolSettings, stringifySchoolSettings } from "../src/lib/school-settings";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "demo123";

const DEMO_SUBJECTS = [
  "Matemática",
  "Português",
  "História",
  "Geografia",
  "Ciências",
  "Inglês",
  "Educação Física",
  "Artes",
];

async function ensureDemoSchoolSettings(schoolId: string, rawSettings: string | null) {
  const settings = parseSchoolSettings(rawSettings);
  if (settings.academic.subjects.length > 0) return;

  const next = {
    ...settings,
    academic: {
      ...settings.academic,
      subjects: DEMO_SUBJECTS,
    },
  };

  await prisma.school.update({
    where: { id: schoolId },
    data: { settings: stringifySchoolSettings(next) },
  });
  console.log("[ensure-demo] Disciplinas da escola demo configuradas.");
}

async function ensureUser(
  schoolId: string,
  passwordHash: string,
  email: string,
  fullName: string,
  role: string
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  console.log(`[ensure-demo] Criando usuário ${email}`);
  return prisma.user.create({
    data: { email, passwordHash, fullName, role, schoolId },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const pinHash = await hashStudentPin("123456");

  let school = await prisma.school.findUnique({ where: { slug: "escola-demo" } });
  if (!school) {
    console.log("[ensure-demo] Criando escola demo...");
    school = await prisma.school.create({
      data: {
        name: "Escola Municipal Demo",
        slug: "escola-demo",
        city: "São Paulo",
        state: "SP",
        legalName: "Escola Municipal Demo LTDA",
        verificationStatus: "verified",
        cnpjCheckedAt: new Date(),
        settings: stringifySchoolSettings({
          ...parseSchoolSettings(null),
          academic: {
            ...parseSchoolSettings(null).academic,
            subjects: DEMO_SUBJECTS,
          },
        }),
      },
    });
  }

  await ensureDemoSchoolSettings(school.id, school.settings);

  await ensureDefaultBadges(school.id);
  await ensureDefaultRewards(school.id);

  await ensureUser(school.id, passwordHash, "admin@eduhub.local", "Ana Diretora", "director");
  await ensureUser(school.id, passwordHash, "secretaria@eduhub.local", "Paula Secretaria", "secretary");

  const teacher = await ensureUser(
    school.id,
    passwordHash,
    "professor@eduhub.local",
    "Carlos Professor",
    "teacher"
  );

  let class8A = await prisma.classGroup.findFirst({
    where: { schoolId: school.id, name: "8º Ano A" },
  });
  if (!class8A) {
    class8A = await prisma.classGroup.create({
      data: {
        schoolId: school.id,
        name: "8º Ano A",
        gradeLevel: "8",
        year: 2026,
        teacherId: teacher.id,
      },
    });
  }

  const lucasUser = await ensureUser(
    school.id,
    passwordHash,
    "lucas@aluno.local",
    "Lucas Henrique",
    "student"
  );
  const lucasStudent = await prisma.student.findUnique({ where: { userId: lucasUser.id } });
  if (!lucasStudent) {
    await prisma.student.create({
      data: {
        userId: lucasUser.id,
        enrollmentCode: "2026001",
        classId: class8A.id,
        xpTotal: 2450,
        level: 8,
        coins: 370,
        birthDate: new Date("2006-05-15"),
        accessPinHash: pinHash,
        accountType: "standard",
      },
    });
  } else if (!lucasStudent.accessPinHash) {
    await prisma.student.update({
      where: { id: lucasStudent.id },
      data: { accessPinHash: pinHash, enrollmentCode: lucasStudent.enrollmentCode || "2026001" },
    });
  }

  const parent = await ensureUser(
    school.id,
    passwordHash,
    "mariana@responsavel.local",
    "Mariana Ribeiro",
    "parent"
  );

  const lucas = await prisma.student.findFirst({
    where: { user: { email: "lucas@aluno.local" } },
  });
  if (lucas) {
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: parent.id, studentId: lucas.id },
    });
    if (!link) {
      await prisma.parentStudent.create({
        data: { parentId: parent.id, studentId: lucas.id, relation: "mae" },
      });
    }
  }

  console.log("[ensure-demo] Contas demo verificadas.");
}

main()
  .catch((e) => {
    console.error("[ensure-demo] Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
