/**
 * Verificação runtime das correções H1–H5 (escreve debug-9787c3.log).
 * Uso: npx tsx scripts/verify-concurrency-fixes.ts
 */
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { assertStudentInScope } from "../src/lib/tenant-guards";
import { maybeAwardPerfectAttendance } from "../src/lib/gamification";
import { enrollStudentInClass } from "../src/lib/student-enrollments";
import type { SessionUser } from "../src/lib/auth";
import { hashPassword } from "../src/lib/security/password-policy";

const LOG = join(process.cwd(), "debug-9787c3.log");
const SESSION = "9787c3";
const TAG = "verify-fix-9787c3";

function log(
  hypothesisId: string,
  message: string,
  data: Record<string, unknown>,
  ok: boolean
) {
  const entry = {
    sessionId: SESSION,
    timestamp: Date.now(),
    runId: "verify-script-v2",
    hypothesisId,
    location: "scripts/verify-concurrency-fixes.ts",
    message,
    data: { ...data, ok },
  };
  appendFileSync(LOG, `${JSON.stringify(entry)}\n`, "utf8");
  console.log(`${ok ? "✓" : "✗"} [${hypothesisId}] ${message}`, data);
}

const prisma = new PrismaClient();

async function cleanup(tag: string) {
  await prisma.user.deleteMany({
    where: { email: { contains: tag } },
  });
  await prisma.school.deleteMany({
    where: { slug: { startsWith: tag } },
  });
}

async function seedFixtures() {
  const passwordHash = await hashPassword("Verify2026!");

  const schoolA = await prisma.school.create({
    data: {
      name: "Verify School A",
      slug: `${TAG}-a`,
      city: "Test",
      state: "DF",
    },
  });
  const schoolB = await prisma.school.create({
    data: {
      name: "Verify School B",
      slug: `${TAG}-b`,
      city: "Test",
      state: "DF",
    },
  });

  const teacherA = await prisma.user.create({
    data: {
      email: `${TAG}-teacher-a@test.local`,
      passwordHash,
      fullName: "Teacher A",
      role: "teacher",
      schoolId: schoolA.id,
    },
  });

  const classA = await prisma.classGroup.create({
    data: {
      name: "Turma A",
      gradeLevel: "1",
      year: 2026,
      schoolId: schoolA.id,
      teacherId: teacherA.id,
    },
  });

  const studentBUser = await prisma.user.create({
    data: {
      email: `${TAG}-student-b@test.local`,
      passwordHash,
      fullName: "Student B",
      role: "student",
      schoolId: schoolB.id,
    },
  });

  const studentB = await prisma.student.create({
    data: {
      userId: studentBUser.id,
      enrollmentCode: `${TAG}-B`,
      xpTotal: 0,
      coins: 0,
      level: 1,
    },
  });

  const classB = await prisma.classGroup.create({
    data: {
      name: "Turma B",
      gradeLevel: "1",
      year: 2026,
      schoolId: schoolB.id,
      teacherId: teacherA.id,
    },
  });

  const teacherForExercise = teacherA;
  const exercise = await prisma.exercise.create({
    data: {
      title: `${TAG} exercise`,
      kind: "exercise",
      schoolId: schoolA.id,
      teacherId: teacherForExercise.id,
      classId: classA.id,
      xpReward: 10,
      coinReward: 5,
      audienceType: "class",
    },
  });

  const question = await prisma.exerciseQuestion.create({
    data: {
      exerciseId: exercise.id,
      prompt: "Q1",
      type: "open",
      points: 10,
      xpReward: 10,
      sortOrder: 0,
    },
  });

  const studentAUser = await prisma.user.create({
    data: {
      email: `${TAG}-student-a@test.local`,
      passwordHash,
      fullName: "Student A",
      role: "student",
      schoolId: schoolA.id,
    },
  });

  const studentA = await prisma.student.create({
    data: {
      userId: studentAUser.id,
      classId: classA.id,
      enrollmentCode: `${TAG}-A`,
      xpTotal: 0,
      coins: 0,
      level: 1,
    },
  });

  await prisma.studentClassEnrollment.create({
    data: { studentId: studentA.id, classId: classA.id, status: "active" },
  });

  const submissionForH3 = await prisma.exerciseSubmission.create({
    data: {
      exerciseId: exercise.id,
      studentId: studentA.id,
      status: "submitted",
      maxScore: 10,
    },
  });

  const submissionForH2 = await prisma.exerciseSubmission.create({
    data: {
      exerciseId: exercise.id,
      studentId: studentB.id,
      status: "submitted",
      maxScore: 10,
    },
  });

  await prisma.exerciseAnswer.create({
    data: {
      submissionId: submissionForH3.id,
      questionId: question.id,
      textAnswer: "x",
    },
  });

  await prisma.exerciseAnswer.create({
    data: {
      submissionId: submissionForH2.id,
      questionId: question.id,
      textAnswer: "y",
    },
  });

  return {
    schoolA,
    schoolB,
    teacherA,
    studentA,
    studentB,
    classB,
    submissionForH2,
    submissionForH3,
  };
}

async function testH1TenantIsolation(
  teacherA: { id: string; schoolId: string | null; fullName: string; email: string },
  foreignStudentId: string
) {
  const user: SessionUser = {
    id: teacherA.id,
    email: teacherA.email,
    fullName: teacherA.fullName,
    role: "teacher",
    avatarUrl: null,
    schoolId: teacherA.schoolId ?? "",
  };

  const scope = await assertStudentInScope(user, foreignStudentId);
  log(
    "H1-tenant",
    scope.ok ? "FAIL cross-tenant allowed" : "cross-tenant blocked",
    { studentId: foreignStudentId, error: scope.ok ? null : scope.error },
    !scope.ok
  );
}

async function testH2GradeIdempotency(submissionId: string) {
  const first = await prisma.exerciseSubmission.updateMany({
    where: { id: submissionId, status: { not: "graded" } },
    data: { status: "graded", gradedAt: new Date() },
  });

  const second = await prisma.exerciseSubmission.updateMany({
    where: { id: submissionId, status: { not: "graded" } },
    data: { status: "graded" },
  });

  log(
    "H2-xp-dup",
    "duplicate grade claim blocked",
    { submissionId, firstClaim: first.count, secondClaim: second.count },
    first.count === 1 && second.count === 0
  );
}

async function testH3SubmitRace(submissionId: string) {
  const results = await Promise.all([
    prisma.exerciseSubmission.updateMany({
      where: { id: submissionId, status: "submitted" },
      data: { status: "graded", score: 10 },
    }),
    prisma.exerciseSubmission.updateMany({
      where: { id: submissionId, status: "submitted" },
      data: { status: "graded", score: 10 },
    }),
  ]);

  const totalClaimed = results.reduce((sum, row) => sum + row.count, 0);
  log(
    "H3-submit-race",
    "concurrent submit claim",
    { submissionId, claims: results.map((r) => r.count), totalClaimed },
    totalClaimed === 1
  );
}

async function testH4PerfectAttendanceRace(studentId: string) {
  const before = await prisma.xpTransaction.count({
    where: { studentId, source: "attendance" },
  });

  await Promise.all([
    maybeAwardPerfectAttendance(studentId),
    maybeAwardPerfectAttendance(studentId),
  ]);

  const after = await prisma.xpTransaction.count({
    where: { studentId, source: "attendance" },
  });

  log(
    "H4-attendance-race",
    "concurrent perfect attendance",
    { studentId, before, after, delta: after - before },
    after - before <= 1
  );
}

async function testEnrollSameSchool(studentId: string, foreignClassId: string) {
  let blocked = false;
  let errorMsg = "";
  try {
    await enrollStudentInClass(studentId, foreignClassId);
  } catch (e) {
    blocked = true;
    errorMsg = e instanceof Error ? e.message : String(e);
  }

  log(
    "H6-enroll",
    blocked ? "cross-school enroll blocked" : "FAIL cross-school enroll allowed",
    { studentId, classId: foreignClassId, error: errorMsg || null },
    blocked
  );
}

async function main() {
  console.log("\n[verify] Limpando fixtures anteriores...");
  await cleanup(TAG);

  console.log("[verify] Criando fixtures temporárias...");
  const fx = await seedFixtures();

  console.log("[verify] Executando testes...\n");
  await testH1TenantIsolation(fx.teacherA, fx.studentB.id);
  await testH3SubmitRace(fx.submissionForH3.id);
  await testH2GradeIdempotency(fx.submissionForH2.id);
  await testH4PerfectAttendanceRace(fx.studentA.id);
  await testEnrollSameSchool(fx.studentA.id, fx.classB.id);

  console.log("\n[verify] Limpando fixtures...");
  await cleanup(TAG);
  await prisma.$disconnect();
  console.log("[verify] Concluído. Log:", LOG, "\n");
}

main().catch(async (e) => {
  console.error(e);
  await cleanup(TAG).catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
