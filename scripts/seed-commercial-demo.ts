import { PrismaClient } from "@prisma/client";
import { ensureDefaultBadges, ensureDefaultRewards } from "../src/lib/school-setup";
import { hashStudentPin } from "../src/lib/student-pin";
import { hashPassword } from "../src/lib/security/password-policy";
import {
  DEMO_PASSWORD,
  DEMO_SCHOOL_SLUG,
  DEMO_DIRECTOR_EMAIL,
  DEMO_TEACHER_EMAIL,
  DEMO_STUDENT_EMAIL,
  DEMO_STUDENT_ENROLLMENT,
} from "../src/lib/demo-accounts";

const prisma = new PrismaClient();

const DEMO_SLUG = DEMO_SCHOOL_SLUG;
const DEFAULT_PASS = DEMO_PASSWORD;

async function ensureDemoShowcaseContent(schoolId: string, teacherId: string) {
  const class6 = await prisma.classGroup.findFirst({
    where: { schoolId, name: "6º Ano A" },
  });
  if (!class6) return;

  const mathExerciseTitle = "Demo: Aventura Matemática";
  const existingMath = await prisma.exercise.findFirst({
    where: { schoolId, title: mathExerciseTitle },
  });

  if (!existingMath) {
    await prisma.exercise.create({
      data: {
        schoolId,
        classId: class6.id,
        teacherId,
        title: mathExerciseTitle,
        description:
          "Para a apresentação: responda as questões e veja XP, moedas e a animação de vitória ao concluir.",
        kind: "homework",
        audienceType: "class",
        maxPoints: 10,
        xpReward: 100,
        coinReward: 30,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        questions: {
          create: [
            {
              prompt: "Qual é o resultado de 3/4 + 1/4?",
              type: "choice",
              points: 3,
              xpReward: 20,
              sortOrder: 0,
              options: JSON.stringify([
                { id: "a", text: "1 inteiro", isCorrect: true },
                { id: "b", text: "4/8", isCorrect: false },
                { id: "c", text: "2/4", isCorrect: false },
                { id: "d", text: "1/2", isCorrect: false },
              ]),
            },
            {
              prompt: "Um triângulo equilátero tem todos os lados com a mesma medida.",
              type: "true_false",
              points: 2,
              xpReward: 15,
              sortOrder: 1,
              options: JSON.stringify([
                { id: "true", text: "Verdadeiro", isCorrect: true },
                { id: "false", text: "Falso", isCorrect: false },
              ]),
            },
            {
              prompt: "7 × 8 = ?",
              type: "choice",
              points: 3,
              xpReward: 20,
              sortOrder: 2,
              options: JSON.stringify([
                { id: "a", text: "54", isCorrect: false },
                { id: "b", text: "56", isCorrect: true },
                { id: "c", text: "64", isCorrect: false },
              ]),
            },
            {
              prompt: "O que é um número primo?",
              type: "text",
              points: 2,
              xpReward: 10,
              sortOrder: 3,
              options: null,
            },
          ],
        },
      },
    });
  }

  const flashTitle = "Demo: Flashcards de Ciências";
  const existingFlash = await prisma.exercise.findFirst({
    where: { schoolId, title: flashTitle },
  });

  if (!existingFlash) {
    await prisma.exercise.create({
      data: {
        schoolId,
        classId: class6.id,
        teacherId,
        title: flashTitle,
        description: "Cartões com animação de virar — ideal para mostrar o modo flashcard do aluno.",
        kind: "homework",
        audienceType: "class",
        maxPoints: 6,
        xpReward: 60,
        coinReward: 15,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        questions: {
          create: [
            {
              prompt: "Fotossíntese",
              type: "flashcard",
              points: 2,
              xpReward: 15,
              sortOrder: 0,
              options: JSON.stringify([
                { id: "back", text: "Processo em que plantas transformam luz em energia química.", isCorrect: true },
              ]),
            },
            {
              prompt: "Sistema Solar",
              type: "flashcard",
              points: 2,
              xpReward: 15,
              sortOrder: 1,
              options: JSON.stringify([
                { id: "back", text: "Conjunto de planetas, asteroides e cometas que orbitam o Sol.", isCorrect: true },
              ]),
            },
            {
              prompt: "Estados da matéria",
              type: "flashcard",
              points: 2,
              xpReward: 15,
              sortOrder: 2,
              options: JSON.stringify([
                { id: "back", text: "Sólido, líquido e gasoso (e plasma em condições extremas).", isCorrect: true },
              ]),
            },
          ],
        },
      },
    });
  }

  const missionTitle = "Demo: Completar exercícios da semana";
  const missionExists = await prisma.mission.findFirst({
    where: { schoolId, title: missionTitle },
  });

  if (!missionExists) {
    await prisma.mission.create({
      data: {
        schoolId,
        classId: class6.id,
        title: missionTitle,
        description: "Finalize pelo menos um exercício demo para ganhar XP extra na apresentação.",
        xpReward: 50,
        coinReward: 20,
        frequency: "WEEKLY",
        isActive: true,
      },
    });
  }

  const missionDailyTitle = "Demo: Check-in diário";
  const dailyExists = await prisma.mission.findFirst({
    where: { schoolId, title: missionDailyTitle },
  });

  if (!dailyExists) {
    await prisma.mission.create({
      data: {
        schoolId,
        classId: class6.id,
        title: missionDailyTitle,
        description: "Marque presença virtual abrindo o painel do aluno hoje.",
        xpReward: 15,
        coinReward: 5,
        frequency: "DAILY",
        isActive: true,
      },
    });
  }
}

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

  const teacherForDemo = await prisma.user.findUnique({
    where: { email: DEMO_TEACHER_EMAIL },
    select: { id: true },
  });
  const demoStudentCount = await prisma.student.count({
    where: { user: { schoolId: school.id } },
  });

  if (demoStudentCount >= 40 && teacherForDemo) {
    await prisma.user.updateMany({
      where: { email: { in: [DEMO_DIRECTOR_EMAIL, DEMO_TEACHER_EMAIL, DEMO_STUDENT_EMAIL] } },
      data: { passwordHash },
    });
    const featured = await prisma.student.findFirst({
      where: { enrollmentCode: DEMO_STUDENT_ENROLLMENT, user: { schoolId: school.id } },
      select: { id: true, userId: true },
    });
    if (featured) {
      await prisma.user.update({
        where: { id: featured.userId },
        data: { fullName: "Gabriel Demo (Apresentação)", passwordHash, role: "student", schoolId: school.id },
      });
      await prisma.student.update({
        where: { id: featured.id },
        data: { accessPinHash: pinHash },
      });
    }
    await ensureDemoShowcaseContent(school.id, teacherForDemo.id);
    console.log("\n[demo-seed] Ambiente demo já existente — credenciais e exercícios sincronizados (modo rápido).");
    console.log("  Login demo: /login/demo");
    console.log("  Acesso apenas pelos botões em /login/demo\n");
    return;
  }

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
    where: { email: DEMO_DIRECTOR_EMAIL },
    update: { schoolId: school.id, role: "director", passwordHash },
    create: {
      email: DEMO_DIRECTOR_EMAIL,
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
    where: { email: DEMO_TEACHER_EMAIL },
    update: { schoolId: school.id, role: "teacher", passwordHash },
    create: {
      email: DEMO_TEACHER_EMAIL,
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

  await prisma.user.upsert({
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
      const code = `DEMO-${cData.grade}-${i.toString().padStart(2, "0")}`;
      const isFeaturedDemoStudent = code === DEMO_STUDENT_ENROLLMENT;
      const fn = isFeaturedDemoStudent
        ? "Gabriel"
        : firstNames[(i + cData.studentCount) % firstNames.length];
      const ln = isFeaturedDemoStudent ? "Demo" : lastNames[(i * 3) % lastNames.length];
      const fullName = isFeaturedDemoStudent ? "Gabriel Demo (Apresentação)" : `${fn} ${ln}`;
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
        update: {
          schoolId: school.id,
          fullName,
          passwordHash,
          role: "student",
        },
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
        update: { classId: classGroup.id, accessPinHash: pinHash, enrollmentCode: code },
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

  await ensureDemoShowcaseContent(school.id, profMath.id);

  console.log("\n========================================================");
  console.log("[demo-seed] Escola de Demonstração Comercial Pronta! 🚀");
  console.log("  Instituição: Colégio Modelo EcoHub (SP)");
  console.log("  Slug:", DEMO_SLUG);
  console.log("  Login demo (1 clique): /login/demo");
  console.log("  Aluno destaque:", DEMO_STUDENT_EMAIL);
  console.log("  Portal da Escola: /e/" + DEMO_SLUG + "/entrar");
  console.log("  Use os botões em /login/demo (sem digitar senha).");
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
