import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ensureDefaultBadges, ensureDefaultRewards } from "../src/lib/school-setup";
import { hashStudentPin } from "../src/lib/student-pin";

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.exerciseAnswer.deleteMany();
  await prisma.exerciseSubmission.deleteMany();
  await prisma.exerciseQuestion.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.rewardRedemption.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.rewardCategory.deleteMany();
  await prisma.parentStudent.deleteMany();
  await prisma.teacherInvite.deleteMany();
  await prisma.xpTransaction.deleteMany();
  await prisma.studentBadge.deleteMany();
  await prisma.studentMission.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.classGroup.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  const passwordHash = await bcrypt.hash("demo123", 10);
  const lucasPinHash = await hashStudentPin("123456");
  const adultBirth = new Date("2010-05-15");

  const school = await prisma.school.create({
    data: {
      name: "Escola Municipal Demo",
      slug: "escola-demo",
      city: "São Paulo",
      state: "SP",
      legalName: "Escola Municipal Demo LTDA",
      verificationStatus: "verified",
      cnpjCheckedAt: new Date(),
    },
  });

  await ensureDefaultBadges(school.id);
  await ensureDefaultRewards(school.id);

  await prisma.user.create({
    data: {
      email: "admin@eduhub.local",
      passwordHash,
      fullName: "Ana Diretora",
      role: "director",
      schoolId: school.id,
    },
  });

  const teacher = await prisma.user.create({
    data: {
      email: "professor@eduhub.local",
      passwordHash,
      fullName: "Carlos Professor",
      role: "teacher",
      schoolId: school.id,
    },
  });

  const class8A = await prisma.classGroup.create({
    data: {
      schoolId: school.id,
      name: "8º Ano A",
      gradeLevel: "8",
      year: 2026,
      teacherId: teacher.id,
    },
  });

  const class9B = await prisma.classGroup.create({
    data: {
      schoolId: school.id,
      name: "9º Ano B",
      gradeLevel: "9",
      year: 2026,
      teacherId: teacher.id,
    },
  });

  const studentUsers = [
    { email: "lucas@aluno.local", name: "Lucas Henrique", code: "2026001", classId: class8A.id, xp: 2450, level: 8, coins: 370, pinHash: lucasPinHash },
    { email: "ana@aluno.local", name: "Ana Beatriz", code: "2026002", classId: class8A.id, xp: 1980, level: 6, coins: 210, pinHash: null as string | null },
    { email: "maria@aluno.local", name: "Maria Eduarda", code: "2026003", classId: class9B.id, xp: 3120, level: 10, coins: 450, pinHash: null },
    { email: "pedro@aluno.local", name: "Pedro Santos", code: "2026004", classId: class9B.id, xp: 890, level: 3, coins: 95, pinHash: null },
  ];

  const students = [];
  for (const s of studentUsers) {
    const user = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash,
        fullName: s.name,
        role: "student",
        schoolId: school.id,
      },
    });
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        enrollmentCode: s.code,
        classId: s.classId,
        xpTotal: s.xp,
        level: s.level,
        coins: s.coins,
        birthDate: adultBirth,
        accessPinHash: s.pinHash,
        accountType: s.pinHash ? "standard" : "standard",
      },
    });
    students.push(student);
  }

  const parent = await prisma.user.create({
    data: {
      email: "mariana@responsavel.local",
      passwordHash,
      fullName: "Mariana Ribeiro",
      role: "parent",
      schoolId: school.id,
    },
  });

  await prisma.parentStudent.create({
    data: { parentId: parent.id, studentId: students[0].id, relation: "mae" },
  });

  await prisma.parentStudent.create({
    data: { parentId: parent.id, studentId: students[1].id, relation: "mae" },
  });

  await prisma.grade.createMany({
    data: [
      { studentId: students[0].id, subject: "Matemática", value: 8.5, period: "1º Bimestre", teacherId: teacher.id },
      { studentId: students[0].id, subject: "Português", value: 7.0, period: "1º Bimestre", teacherId: teacher.id },
      { studentId: students[1].id, subject: "Matemática", value: 9.0, period: "1º Bimestre", teacherId: teacher.id },
      { studentId: students[2].id, subject: "Matemática", value: 9.5, period: "1º Bimestre", teacherId: teacher.id },
      { studentId: students[3].id, subject: "Matemática", value: 5.5, period: "1º Bimestre", teacherId: teacher.id },
    ],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.attendance.createMany({
    data: [
      { studentId: students[0].id, classId: class8A.id, date: today, status: "present" },
      { studentId: students[1].id, classId: class8A.id, date: today, status: "present" },
      { studentId: students[2].id, classId: class9B.id, date: today, status: "late" },
      { studentId: students[3].id, classId: class9B.id, date: today, status: "absent" },
    ],
  });

  const mission1 = await prisma.mission.create({
    data: {
      schoolId: school.id,
      classId: class8A.id,
      title: "Quiz de Frações",
      description: "Complete o quiz sobre frações e equações simples.",
      xpReward: 150,
      coinReward: 50,
      dueDate: new Date("2026-08-15"),
      isActive: true,
    },
  });

  await prisma.mission.create({
    data: {
      schoolId: school.id,
      title: "Leitura Semanal",
      description: "Leia 20 páginas e responda 5 perguntas.",
      xpReward: 100,
      coinReward: 30,
      dueDate: new Date("2026-08-20"),
      isActive: true,
    },
  });

  const badge1 = await prisma.badge.create({
    data: { schoolId: school.id, name: "Pontualidade", description: "30 dias sem faltas", icon: "clock", xpRequired: 500 },
  });

  await prisma.studentMission.create({
    data: { studentId: students[0].id, missionId: mission1.id, completedAt: new Date() },
  });

  await prisma.studentBadge.create({
    data: { studentId: students[2].id, badgeId: badge1.id },
  });

  const rewards = await prisma.reward.findMany({ where: { schoolId: school.id }, take: 2 });
  if (rewards[0]) {
    await prisma.rewardRedemption.create({
      data: { studentId: students[0].id, rewardId: rewards[0].id, coinCost: rewards[0].coinCost },
    });
    await prisma.student.update({
      where: { id: students[0].id },
      data: { coins: { decrement: rewards[0].coinCost } },
    });
  }

  await prisma.xpTransaction.createMany({
    data: [
      { studentId: students[0].id, amount: 150, reason: "Missão: Quiz de Frações", source: "mission" },
      { studentId: students[0].id, amount: 50, reason: "Presença semanal", source: "attendance" },
      { studentId: students[2].id, amount: 200, reason: "Nota acima de 9.0", source: "grade" },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: students[0].userId,
        title: "Nova nota lançada",
        message: "Matemática: 8.5 (1º Bimestre)",
        href: "/dashboard/aluno",
        isRead: false,
      },
      {
        userId: students[0].userId,
        title: "Missão concluída!",
        message: "Você ganhou 150 XP em Quiz de Frações.",
        href: "/dashboard/aluno",
        isRead: true,
      },
      {
        userId: parent.id,
        title: "Nota do filho(a)",
        message: "Lucas — Matemática: 8.5",
        href: `/dashboard/responsavel/filho/${students[0].id}`,
        isRead: false,
      },
    ],
  });

  await prisma.exercise.create({
    data: {
      schoolId: school.id,
      classId: class8A.id,
      teacherId: teacher.id,
      title: "Exercício de Frações — Casa",
      description: "Resolva as questões abaixo. Questões de texto serão corrigidas pelo professor.",
      kind: "homework",
      maxPoints: 10,
      xpReward: 80,
      coinReward: 25,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      questions: {
        create: [
          {
            prompt: "Quanto é 1/2 + 1/4?",
            type: "choice",
            points: 5,
            sortOrder: 0,
            options: JSON.stringify([
              { id: "a", text: "3/4", isCorrect: true },
              { id: "b", text: "2/4", isCorrect: false },
              { id: "c", text: "1/3", isCorrect: false },
            ]),
          },
          {
            prompt: "Explique com suas palavras o que é uma fração equivalente.",
            type: "text",
            points: 5,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  console.log("Seed concluído!");
  console.log("Diretor: admin@eduhub.local / demo123");
  console.log("Professor: professor@eduhub.local / demo123");
  console.log("Responsável: mariana@responsavel.local / demo123 (filhos: Lucas e Ana)");
  console.log("Alunos: lucas@aluno.local / demo123 · PIN demo: matrícula 2026001 / PIN 123456");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
