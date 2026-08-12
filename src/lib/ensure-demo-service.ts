import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ensureDefaultBadges, ensureDefaultRewards } from "@/lib/school-setup";
import { hashStudentPin } from "@/lib/student-pin";
import { parseSchoolSettings, stringifySchoolSettings } from "@/lib/school-settings";

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

const KNOWN_DEMO_EMAILS = new Set([
  "admin@eduhub.local",
  "secretaria@eduhub.local",
  "professor@eduhub.local",
  "lucas@aluno.local",
  "mariana@responsavel.local",
  "ana@aluno.local",
  "maria@aluno.local",
  "pedro@aluno.local",
]);

export function isKnownDemoEmail(email: string): boolean {
  return KNOWN_DEMO_EMAILS.has(email.trim().toLowerCase());
}

export async function ensureDemoEnvironment() {
  try {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const pinHash = await hashStudentPin("123456");

    let school = await prisma.school.findUnique({ where: { slug: "escola-demo" } });
    if (!school) {
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

    await ensureDefaultBadges(school.id);
    await ensureDefaultRewards(school.id);

    // Ensure Director
    let director = await prisma.user.findUnique({ where: { email: "admin@eduhub.local" } });
    if (!director) {
      director = await prisma.user.create({
        data: {
          email: "admin@eduhub.local",
          passwordHash,
          fullName: "Ana Diretora",
          role: "director",
          schoolId: school.id,
        },
      });
    }

    // Ensure Secretary
    const secretary = await prisma.user.findUnique({ where: { email: "secretaria@eduhub.local" } });
    if (!secretary) {
      await prisma.user.create({
        data: {
          email: "secretaria@eduhub.local",
          passwordHash,
          fullName: "Paula Secretaria",
          role: "secretary",
          schoolId: school.id,
        },
      });
    }

    // Ensure Teacher
    let teacher = await prisma.user.findUnique({ where: { email: "professor@eduhub.local" } });
    if (!teacher) {
      teacher = await prisma.user.create({
        data: {
          email: "professor@eduhub.local",
          passwordHash,
          fullName: "Carlos Professor",
          role: "teacher",
          schoolId: school.id,
          city: "São Paulo",
          state: "SP",
        },
      });
    }

    // Ensure Class 8A
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

    // Ensure Lucas Student
    let lucasUser = await prisma.user.findUnique({ where: { email: "lucas@aluno.local" } });
    if (!lucasUser) {
      lucasUser = await prisma.user.create({
        data: {
          email: "lucas@aluno.local",
          passwordHash,
          fullName: "Lucas Henrique",
          role: "student",
          schoolId: school.id,
        },
      });
    }

    let lucasStudent = await prisma.student.findUnique({ where: { userId: lucasUser.id } });
    if (!lucasStudent) {
      lucasStudent = await prisma.student.create({
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

    // Ensure Parent
    let parent = await prisma.user.findUnique({ where: { email: "mariana@responsavel.local" } });
    if (!parent) {
      parent = await prisma.user.create({
        data: {
          email: "mariana@responsavel.local",
          passwordHash,
          fullName: "Mariana Ribeiro",
          role: "parent",
          schoolId: school.id,
        },
      });
    }

    if (lucasStudent) {
      const link = await prisma.parentStudent.findFirst({
        where: { parentId: parent.id, studentId: lucasStudent.id },
      });
      if (!link) {
        await prisma.parentStudent.create({
          data: { parentId: parent.id, studentId: lucasStudent.id, relation: "mae" },
        });
      }
    }
  } catch (err) {
    console.error("[ensure-demo-service] Erro ao assegurar contas demo:", err);
  }
}
