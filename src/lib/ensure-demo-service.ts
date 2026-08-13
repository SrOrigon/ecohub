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

async function ensureUser(
  schoolId: string,
  passwordHash: string,
  email: string,
  fullName: string,
  role: string
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const validPass = await bcrypt.compare(DEMO_PASSWORD, existing.passwordHash);
    if (!validPass || existing.role !== role || existing.schoolId !== schoolId) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          role,
          schoolId,
        },
      });
    }
    return existing;
  }
  return prisma.user.create({
    data: { email, passwordHash, fullName, role, schoolId },
  });
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

    try { await ensureDefaultBadges(school.id); } catch (e) { console.error("[ensureDemoEnvironment] Badges notice:", e); }
    try { await ensureDefaultRewards(school.id); } catch (e) { console.error("[ensureDemoEnvironment] Rewards notice:", e); }

    // Ensure Director
    try { await ensureUser(school.id, passwordHash, "admin@eduhub.local", "Ana Diretora", "director"); } catch (e) { console.error("[ensureDemoEnvironment] Director notice:", e); }

    // Ensure Secretary
    try { await ensureUser(school.id, passwordHash, "secretaria@eduhub.local", "Paula Secretaria", "secretary"); } catch (e) { console.error("[ensureDemoEnvironment] Secretary notice:", e); }

    // Ensure Teacher
    let teacher: Awaited<ReturnType<typeof ensureUser>> | null = null;
    try {
      teacher = await ensureUser(
        school.id,
        passwordHash,
        "professor@eduhub.local",
        "Carlos Professor",
        "teacher"
      );
    } catch (e) { console.error("[ensureDemoEnvironment] Teacher notice:", e); }

    // Ensure Class 8A
    let class8A: Awaited<ReturnType<typeof prisma.classGroup.findFirst>> | null = null;
    try {
      class8A = await prisma.classGroup.findFirst({
        where: { schoolId: school.id, name: "8º Ano A" },
      });
      if (!class8A) {
        class8A = await prisma.classGroup.create({
          data: {
            schoolId: school.id,
            name: "8º Ano A",
            gradeLevel: "8",
            year: 2026,
            teacherId: teacher?.id ?? null,
          },
        });
      }
    } catch (e) { console.error("[ensureDemoEnvironment] Class8A notice:", e); }

    // Ensure Lucas Student
    let lucasStudent: Awaited<ReturnType<typeof prisma.student.findUnique>> | null = null;
    try {
      const lucasUser = await ensureUser(
        school.id,
        passwordHash,
        "lucas@aluno.local",
        "Lucas Henrique",
        "student"
      );

      lucasStudent = await prisma.student.findUnique({ where: { userId: lucasUser.id } });
      if (!lucasStudent) {
        lucasStudent = await prisma.student.create({
          data: {
            userId: lucasUser.id,
            enrollmentCode: "2026001",
            classId: class8A?.id ?? null,
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
    } catch (e) { console.error("[ensureDemoEnvironment] Student notice:", e); }

    // Ensure Parent
    try {
      const parent = await ensureUser(
        school.id,
        passwordHash,
        "mariana@responsavel.local",
        "Mariana Ribeiro",
        "parent"
      );

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
    } catch (e) { console.error("[ensureDemoEnvironment] Parent notice:", e); }
  } catch (err) {
    console.error("[ensure-demo-service] Erro ao assegurar contas demo:", err);
  }
}
