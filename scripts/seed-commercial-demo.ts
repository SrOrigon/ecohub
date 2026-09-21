import { PrismaClient } from "@prisma/client";
import { ensureDefaultBadges, ensureDefaultRewards } from "../src/lib/school-setup";
import { hashStudentPin } from "../src/lib/student-pin";
import { hashPassword } from "../src/lib/security/password-policy";

const prisma = new PrismaClient();

const DEMO_SLUG = "colegio-modelo-ecohub";
const DEFAULT_PASS = "EcoHub2026!";

async function main() {
  console.log("[demo-seed] Iniciando geração da massa de dados comercial...");

  const passwordHash = await hashPassword(DEFAULT_PASS);
  const pinHash = await hashStudentPin("123456");

  // 1. Criar ou atualizar Escola
  const school = await prisma.school.upsert({
    where: { slug: DEMO_SLUG },
    update: {
      name: "Colégio Modelo EcoHub",
      legalName: "Colégio Modelo EcoHub Ensino Fundamental LTDA",
      city: "São Paulo",
      state: "SP",
      verificationStatus: "verified",
      cnpjCheckedAt: new Date(),
    },
    create: {
      name: "Colégio Modelo EcoHub",
      slug: DEMO_SLUG,
      legalName: "Colégio Modelo EcoHub Ensino Fundamental LTDA",
      city: "São Paulo",
      state: "SP",
      verificationStatus: "verified",
      cnpjCheckedAt: new Date(),
    },
  });

  await ensureDefaultBadges(school.id);
  await ensureDefaultRewards(school.id);

  // 2. Configuração de Pagamento Pix
  await prisma.schoolPaymentConfig.upsert({
    where: { schoolId: school.id },
    update: {
      providerType: "MANUAL_PIX",
      pixKey: "colegio.modelo@ecohub.com.br",
      pixKeyType: "EMAIL",
      beneficiaryName: "Colégio Modelo EcoHub LTDA",
      bankName: "Banco do Brasil",
      instructions: "Efetue o pagamento via Pix até o dia 10 e anexe o comprovante pelo aplicativo para baixar sua mensalidade.",
      isActive: true,
    },
    create: {
      schoolId: school.id,
      providerType: "MANUAL_PIX",
      pixKey: "colegio.modelo@ecohub.com.br",
      pixKeyType: "EMAIL",
      beneficiaryName: "Colégio Modelo EcoHub LTDA",
      bankName: "Banco do Brasil",
      instructions: "Efetue o pagamento via Pix até o dia 10 e anexe o comprovante pelo aplicativo para baixar sua mensalidade.",
      isActive: true,
    },
  });

  // 3. Gestores (Diretor e Secretários)
  const directorUser = await prisma.user.upsert({
    where: { email: "diretora.helena@colegiomodelo.com.br" },
    update: { schoolId: school.id, role: "director" },
    create: {
      email: "diretora.helena@colegiomodelo.com.br",
      fullName: "Helena Souza",
      passwordHash,
      role: "director",
      schoolId: school.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "secretario.marcos@colegiomodelo.com.br" },
    update: { schoolId: school.id, role: "secretary" },
    create: {
      email: "secretario.marcos@colegiomodelo.com.br",
      fullName: "Marcos Silva",
      passwordHash,
      role: "secretary",
      schoolId: school.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "secretaria.patricia@colegiomodelo.com.br" },
    update: { schoolId: school.id, role: "secretary" },
    create: {
      email: "secretaria.patricia@colegiomodelo.com.br",
      fullName: "Patricia Lima",
      passwordHash,
      role: "secretary",
      schoolId: school.id,
    },
  });

  // 4. Professores
  const profMath = await prisma.user.upsert({
    where: { email: "prof.ricardo@colegiomodelo.com.br" },
    update: { schoolId: school.id, role: "teacher" },
    create: {
      email: "prof.ricardo@colegiomodelo.com.br",
      fullName: "Ricardo Santos (Matemática)",
      passwordHash,
      role: "teacher",
      schoolId: school.id,
    },
  });

  const profPort = await prisma.user.upsert({
    where: { email: "prof.amanda@colegiomodelo.com.br" },
    update: { schoolId: school.id, role: "teacher" },
    create: {
      email: "prof.amanda@colegiomodelo.com.br",
      fullName: "Amanda Oliveira (Português & História)",
      passwordHash,
      role: "teacher",
      schoolId: school.id,
    },
  });

  const profSci = await prisma.user.upsert({
    where: { email: "prof.carlos@colegiomodelo.com.br" },
    update: { schoolId: school.id, role: "teacher" },
    create: {
      email: "prof.carlos@colegiomodelo.com.br",
      fullName: "Carlos Eduardo (Ciências)",
      passwordHash,
      role: "teacher",
      schoolId: school.id,
    },
  });

  const profGeo = await prisma.user.upsert({
    where: { email: "prof.juliana@colegiomodelo.com.br" },
    update: { schoolId: school.id, role: "teacher" },
    create: {
      email: "prof.juliana@colegiomodelo.com.br",
      fullName: "Juliana Costa (Geografia & Artes)",
      passwordHash,
      role: "teacher",
      schoolId: school.id,
    },
  });

  // 5. Turmas
  const classesData = [
    { name: "6º Ano A", grade: "6", year: 2026, teacherId: profMath.id, studentCount: 17 },
    { name: "7º Ano B", grade: "7", year: 2026, teacherId: profPort.id, studentCount: 18 },
    { name: "8º Ano C", grade: "8", year: 2026, teacherId: profSci.id, studentCount: 16 },
  ];

  const firstNames = [
    "Gabriel", "Beatriz", "Matheus", "Sofia", "Lucas", "Isabella", "Enzo", "Manuela",
    "Bernardo", "Laura", "Pedro", "Luiza", "Rafael", "Valentina", "Guilherme", "Giovanna",
    "Nicolas", "Maria Eduarda", "Felipe", "Alice", "Thiago", "Clara", "Daniel", "Helena"
  ];

  const lastNames = [
    "Ferreira", "Almeida", "Ribeiro", "Carvalho", "Gomes", "Martins", "Araújo", "Melo",
    "Barbosa", "Rocha", "Dias", "Moreira", "Nascimento", "Cardoso", "Teixeira", "Mendes"
  ];

  const subjects = ["Matemática", "Língua Portuguesa", "História", "Ciências", "Geografia", "Artes"];

  for (const cData of classesData) {
    let classGroup = await prisma.classGroup.findFirst({
      where: { schoolId: school.id, name: cData.name },
    });

    if (!classGroup) {
      classGroup = await prisma.classGroup.create({
        data: {
          schoolId: school.id,
          name: cData.name,
          gradeLevel: cData.grade,
          year: cData.year,
          teacherId: cData.teacherId,
        },
      });
    }

    console.log(`[demo-seed] Gerando ${cData.studentCount} alunos para a turma "${cData.name}"...`);

    for (let i = 1; i <= cData.studentCount; i++) {
      const fn = firstNames[(i + cData.studentCount) % firstNames.length];
      const ln = lastNames[(i * 3) % lastNames.length];
      const fullName = `${fn} ${ln}`;
      const code = `DEMO-${cData.grade}-${i.toString().padStart(2, "0")}`;
      const studentEmail = `aluno.${code.toLowerCase()}@colegiomodelo.com.br`;
      const parentEmail = `resp.${code.toLowerCase()}@colegiomodelo.com.br`;

      // Parent User
      const parentUser = await prisma.user.upsert({
        where: { email: parentEmail },
        update: { schoolId: school.id },
        create: {
          email: parentEmail,
          fullName: `Responsável de ${fn}`,
          passwordHash,
          role: "parent",
          schoolId: school.id,
          phone: `1198${Math.floor(1000000 + Math.random() * 9000000)}`,
        },
      });

      // Student User
      const studentUser = await prisma.user.upsert({
        where: { email: studentEmail },
        update: { schoolId: school.id },
        create: {
          email: studentEmail,
          fullName,
          passwordHash,
          role: "student",
          schoolId: school.id,
        },
      });

      // Student Profile
      const student = await prisma.student.upsert({
        where: { userId: studentUser.id },
        update: { classId: classGroup.id },
        create: {
          userId: studentUser.id,
          classId: classGroup.id,
          enrollmentCode: code,
          accessPinHash: pinHash,
          birthDate: new Date(2013 - Number(cData.grade), i % 12, (i * 2) % 28 + 1),
          xpTotal: 250 + i * 40,
          level: Math.floor((250 + i * 40) / 200) + 1,
          coins: 60 + i * 10,
          provisionedById: directorUser.id,
        },
      });

      // Parent - Student Link
      await prisma.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parentUser.id, studentId: student.id } },
        update: {},
        create: { parentId: parentUser.id, studentId: student.id, relation: "responsavel" },
      });

      // Student Class Enrollment
      await prisma.studentClassEnrollment.upsert({
        where: { studentId_classId: { studentId: student.id, classId: classGroup.id } },
        update: { status: "active" },
        create: { studentId: student.id, classId: classGroup.id, status: "active" },
      });

      // Finance Account
      await prisma.studentFinanceAccount.upsert({
        where: { studentId: student.id },
        update: { monthlyAmountCents: 85000, dueDay: 10, discountPercent: i % 3 === 0 ? 10 : 0 },
        create: { studentId: student.id, monthlyAmountCents: 85000, dueDay: 10, discountPercent: i % 3 === 0 ? 10 : 0 },
      });

      // Lançamento de Frequências (últimos 15 dias letivos)
      const now = new Date();
      for (let dayOffset = 1; dayOffset <= 15; dayOffset++) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const rand = (i + dayOffset) % 20;
        const status = rand === 0 ? "absent" : rand === 1 ? "justified" : "present";

        await prisma.attendance.upsert({
          where: { studentId_date: { studentId: student.id, date } },
          update: { status },
          create: {
            studentId: student.id,
            classId: classGroup.id,
            date,
            status,
            justificationNote: status === "justified" ? "Atestado médico entregue pelo responsável" : null,
          },
        });
      }

      // Lançamento de Notas Bimestrais
      for (const subject of subjects) {
        const val = Math.min(10, Math.max(5, Math.round((7 + (i % 4) - (i % 2) * 0.8) * 10) / 10));
        await prisma.grade.create({
          data: {
            studentId: student.id,
            subject,
            value: val,
            maxValue: 10,
            period: "1º Bimestre",
            teacherId: cData.teacherId,
          },
        });
      }
    }
  }

  console.log("\n========================================================");
  console.log("[demo-seed] Escola de Demonstração Comercial Pronta! 🚀");
  console.log("  Instituição: Colégio Modelo EcoHub (SP)");
  console.log("  Slug:", DEMO_SLUG);
  console.log("  Portal da Escola: /e/" + DEMO_SLUG + "/entrar");
  console.log("  Acesso Diretor: diretora.helena@colegiomodelo.com.br / " + DEFAULT_PASS);
  console.log("  Acesso Professor: prof.ricardo@colegiomodelo.com.br / " + DEFAULT_PASS);
  console.log("  Acesso Aluno PIN: DEMO-6-01 / 123456");
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
