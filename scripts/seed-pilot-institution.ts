import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ensureDefaultBadges, ensureDefaultRewards } from "../src/lib/school-setup";
import { hashStudentPin } from "../src/lib/student-pin";

/** Escola piloto idempotente para validação institucional (não apaga demo). */
const prisma = new PrismaClient();

const SLUG = "escola-piloto-validacao";
const DIRECTOR_EMAIL = "diretor.piloto@instituicao.local";

async function main() {
  const existing = await prisma.school.findUnique({ where: { slug: SLUG } });
  if (existing) {
    console.log("[piloto] Escola piloto já existe:", existing.name);
    return;
  }

  const passwordHash = await bcrypt.hash("Piloto2026!", 10);
  const pinHash = await hashStudentPin("654321");

  const school = await prisma.school.create({
    data: {
      name: "Escola Piloto Validação",
      slug: SLUG,
      city: "Brasília",
      state: "DF",
      legalName: "Escola Piloto Validação EPP",
      verificationStatus: "verified",
      cnpjCheckedAt: new Date(),
    },
  });

  await ensureDefaultBadges(school.id);
  await ensureDefaultRewards(school.id);

  const director = await prisma.user.create({
    data: {
      email: DIRECTOR_EMAIL,
      passwordHash,
      fullName: "Diretor Piloto",
      role: "director",
      schoolId: school.id,
    },
  });

  const teacher = await prisma.user.create({
    data: {
      email: "professor.piloto@instituicao.local",
      passwordHash,
      fullName: "Professora Piloto",
      role: "teacher",
      schoolId: school.id,
    },
  });

  const classGroup = await prisma.classGroup.create({
    data: {
      name: "9º Ano Piloto",
      gradeLevel: "9",
      year: 2026,
      schoolId: school.id,
      teacherId: teacher.id,
    },
  });

  const studentUser = await prisma.user.create({
    data: {
      email: "aluno.piloto@instituicao.local",
      passwordHash,
      fullName: "Aluno Piloto",
      role: "student",
      schoolId: school.id,
    },
  });

  await prisma.student.create({
    data: {
      userId: studentUser.id,
      classId: classGroup.id,
      enrollmentCode: "PILOTO001",
      accessPinHash: pinHash,
      birthDate: new Date("2011-03-10"),
      level: 1,
      coins: 50,
    },
  });

  console.log("[piloto] Escola piloto criada com sucesso");
  console.log("  Slug:", SLUG);
  console.log("  Diretor:", DIRECTOR_EMAIL, "/ Piloto2026!");
  console.log("  Aluno PIN: PILOTO001 / 654321");
  console.log("  Diretor ID:", director.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
