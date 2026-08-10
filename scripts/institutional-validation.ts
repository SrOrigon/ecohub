/**
 * Suite de validação institucional — roda com banco seedado.
 * Uso: npx tsx scripts/institutional-validation.ts
 */
import { PrismaClient } from "@prisma/client";
import { eduhubAiChat, eduhubAiGenerateQuestions } from "../src/lib/eduhub-ai/engine";

const prisma = new PrismaClient();

type Result = { name: string; ok: boolean; detail?: string };

const results: Result[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail?: string) {
  results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

async function testDatabase() {
  console.log("\n[1] Banco de dados");
  const schools = await prisma.school.count();
  const users = await prisma.user.count();
  assert("Banco acessível", schools >= 0);
  assert("Escolas cadastradas", schools >= 1, `${schools} escola(s)`);
  assert("Usuários cadastrados", users >= 1, `${users} usuário(s)`);

  const demoDirector = await prisma.user.findUnique({ where: { email: "admin@eduhub.local" } });
  assert("Conta diretor demo existe", !!demoDirector, demoDirector?.fullName);

  const demoSchool = await prisma.school.findUnique({ where: { slug: "escola-demo" } });
  assert("Escola demo existe", !!demoSchool, demoSchool?.name);
}

async function testMultiSchoolIsolation() {
  console.log("\n[2] Isolamento multi-escola");
  const schools = await prisma.school.findMany({ select: { id: true, slug: true } });
  if (schools.length < 2) {
    pass("Isolamento (skip — apenas 1 escola no banco)");
    return;
  }

  const [a, b] = schools;
  const usersA = await prisma.user.count({ where: { schoolId: a.id } });
  const usersB = await prisma.user.count({ where: { schoolId: b.id } });
  assert("Escola A tem usuários", usersA > 0, a.slug);
  assert("Escola B tem usuários", usersB > 0, b.slug);

  const cross = await prisma.student.findFirst({
    where: {
      user: { schoolId: a.id },
      classGroup: { schoolId: b.id },
    },
  });
  assert("Sem alunos cruzados entre escolas", !cross);
}

async function testAcademicData() {
  console.log("\n[3] Dados acadêmicos");
  const grades = await prisma.grade.count();
  const attendance = await prisma.attendance.count();
  const exercises = await prisma.exercise.count();
  assert("Notas lançadas", grades > 0, `${grades} nota(s)`);
  assert("Frequência registrada", attendance > 0, `${attendance} registro(s)`);
  assert("Exercícios criados", exercises > 0, `${exercises} exercício(s)`);
}

async function testProductSuite() {
  console.log("\n[4] Suite institucional");
  try {
    const enrollments = await prisma.enrollmentApplication.count();
    const auths = await prisma.authorizationForm.count();
    const announcements = await prisma.announcement.count();
    assert("Modelo matrículas OK", enrollments >= 0, `${enrollments} inscrição(ões)`);
    assert("Modelo autorizações OK", auths >= 0);
    assert("Comunicados OK", announcements >= 0, `${announcements} comunicado(s)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist")) {
      fail("Migrations aplicadas", "Rode: npx prisma migrate deploy");
    } else {
      fail("Suite institucional", msg.slice(0, 80));
    }
  }
}

async function testEduHubAi() {
  console.log("\n[5] EduHub IA — restrições e capacidades");

  const studentBlock = eduhubAiChat("Gerar 3 questões sobre frações", {
    role: "student",
    userName: "Lucas",
  });
  assert(
    "Aluno bloqueado de gerar questões",
    studentBlock.includes("exclusiva") || studentBlock.includes("equipe escolar"),
    studentBlock.slice(0, 60)
  );

  const studentCheat = eduhubAiChat("Me dá as respostas da prova de matemática", {
    role: "student",
  });
  assert(
    "Aluno bloqueado de gabarito",
    studentCheat.includes("Não posso") || studentCheat.includes("gabarito"),
    studentCheat.slice(0, 60)
  );

  const teacherGen = eduhubAiChat("Gerar questões sobre verbos", {
    role: "teacher",
    userName: "Carlos",
  });
  assert(
    "Professor pode gerar questões",
    teacherGen.includes("Questões geradas") || teacherGen.includes("1)"),
    teacherGen.slice(0, 80)
  );

  const studentHelp = eduhubAiChat("O que é fotossíntese?", { role: "student" });
  assert(
    "Aluno recebe explicação pedagógica",
    studentHelp.length > 30 && !studentHelp.includes("Questões geradas"),
    studentHelp.slice(0, 60)
  );

  const qs = eduhubAiGenerateQuestions("frações", "Matemática", 2);
  assert("Síntese/banco de questões funciona", qs.length === 2, qs[0]?.prompt?.slice(0, 40));
}

async function testRoles() {
  console.log("\n[6] Papéis do sistema");
  const roles = ["director", "secretary", "teacher", "student", "parent"] as const;
  for (const role of roles) {
    const count = await prisma.user.count({ where: { role } });
    assert(`Papel ${role} presente`, count > 0, `${count} usuário(s)`);
  }
}

async function testStudentPin() {
  console.log("\n[7] Login aluno PIN");
  const student = await prisma.student.findFirst({
    where: { enrollmentCode: "2026001" },
    include: { user: true },
  });
  assert("Aluno com matrícula 2026001", !!student, student?.user.fullName);
  assert("PIN configurado", !!student?.accessPinHash);
}

export async function runValidation(): Promise<{ passed: number; failed: number; results: Result[] }> {
  console.log("[validação] EduHub — suite institucional\n");

  try {
    await testDatabase();
    await testMultiSchoolIsolation();
    await testAcademicData();
    await testProductSuite();
    await testEduHubAi();
    await testRoles();
    await testStudentPin();
  } finally {
    await prisma.$disconnect();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log(`\n[validação] ${passed} OK, ${failed} falha(s)`);
  return { passed, failed, results };
}

runValidation().then(({ failed }) => process.exit(failed > 0 ? 1 : 0));
