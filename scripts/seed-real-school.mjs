import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STANDARD_SUBJECTS = [
  "Matemática",
  "Língua Portuguesa",
  "História",
  "Geografia",
  "Ciências",
  "Física",
  "Química",
  "Biologia",
  "Educação Física",
  "Artes",
  "Língua Inglesa",
  "Filosofia",
  "Sociologia",
];

const DEFAULT_SETTINGS = {
  xp: {
    perGradePoint: 5,
    gradeBonusThreshold: 9,
    gradeBonus: 50,
    attendancePresent: 10,
    attendanceLate: 5,
    badgeUnlock: 25,
    xpPerLevel: 300,
  },
  missions: {
    defaultXp: 100,
    defaultCoins: 30,
  },
  exercises: {
    autoGradeEnabled: true,
    postGradeToBulletin: true,
    presets: [
      { label: "Atividade Leve", xp: 40, coins: 10, points: 5 },
      { label: "Exercício Prático", xp: 80, coins: 20, points: 10 },
      { label: "Avaliação Bimestral", xp: 150, coins: 40, points: 10 },
      { label: "Desafio Especial", xp: 200, coins: 50, points: 15 },
    ],
  },
  academic: {
    subjects: STANDARD_SUBJECTS,
    periods: ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"],
    maxGrade: 10,
    passGrade: 7,
  },
  notifications: {
    parentsOnGrade: true,
    parentsOnAbsence: true,
    parentsOnMission: true,
    parentsOnShop: true,
    parentsOnExercise: true,
    parentsOnExerciseGraded: true,
    parentsOnOccurrence: true,
    parentsOnAnnouncement: true,
    studentOnAbsence: true,
    teacherOnSubmission: true,
  },
  branding: {
    primaryColor: "#4f46e5",
    accentColor: "#f59e0b",
    tagline: "Aprender, evoluir, conquistar",
  },
};

async function main() {
  const schoolId = process.argv[2];
  if (!schoolId) {
    console.log("Uso: node scripts/seed-real-school.mjs <SCHOOL_ID>");
    const schools = await prisma.school.findMany({ select: { id: true, name: true, slug: true } });
    console.log("\nEscolas encontradas no banco:");
    schools.forEach((s) => console.log(` - ID: ${s.id} | Nome: ${s.name} | Slug: ${s.slug}`));
    return;
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    console.error(`Escola com ID "${schoolId}" não foi encontrada.`);
    return;
  }

  console.log(`Inicializando dados padrão para a instituição: ${school.name}...`);

  await prisma.school.update({
    where: { id: schoolId },
    data: { settings: JSON.stringify(DEFAULT_SETTINGS) },
  });

  console.log("✔ Configurações acadêmicas e disciplinas inicializadas!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
