import { findUserByEmailForLogin, verifyAndUpgradePassword } from "../src/lib/auth-credentials";
import {
  DEMO_DIRECTOR_EMAIL,
  DEMO_TEACHER_EMAIL,
  DEMO_STUDENT_EMAIL,
  DEMO_PASSWORD,
  DEMO_SCHOOL_SLUG,
} from "../src/lib/demo-accounts";
import { normalizePassword } from "../src/lib/security/password-policy";
import { findSchoolBySlug } from "../src/lib/school-lookup";
import { prisma } from "../src/lib/db";

async function checkUser(email: string) {
  const user = await findUserByEmailForLogin(email);
  if (!user) {
    console.error("[verify-demo] usuário ausente:", email);
    return false;
  }
  const ok = await verifyAndUpgradePassword(user, normalizePassword(DEMO_PASSWORD));
  if (!ok) console.error("[verify-demo] senha inválida:", email);
  else console.log("[verify-demo] OK", email);
  return ok;
}

async function main() {
  const school = await findSchoolBySlug(DEMO_SCHOOL_SLUG);
  if (!school) {
    console.error("[verify-demo] escola demo não encontrada — rode npm run db:demo");
    process.exit(1);
  }

  const exercises = await prisma.exercise.count({
    where: { schoolId: school.id, title: { startsWith: "Demo:" } },
  });
  if (exercises < 2) {
    console.error("[verify-demo] exercícios demo insuficientes:", exercises);
    process.exit(1);
  }

  const results = await Promise.all([
    checkUser(DEMO_DIRECTOR_EMAIL),
    checkUser(DEMO_TEACHER_EMAIL),
    checkUser(DEMO_STUDENT_EMAIL),
  ]);

  if (!results.every(Boolean)) process.exit(1);
  console.log("[verify-demo] Ambiente pronto para apresentação.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
