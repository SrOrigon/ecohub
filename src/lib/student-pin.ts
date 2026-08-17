import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { BCRYPT_ROUNDS } from "@/lib/security/constants";
import { prisma } from "@/lib/db";

export function generateStudentPin(): string {
  return String(randomInt(100000, 999999));
}

export async function hashStudentPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

export async function verifyStudentPin(pin: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash || !pin) return false;
  return bcrypt.compare(pin, hash);
}

export function syntheticStudentEmail(schoolSlug: string, enrollmentCode: string): string {
  const safeSlug = schoolSlug.replace(/[^a-z0-9-]/g, "");
  const safeCode = enrollmentCode.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `aluno.${safeCode}@${safeSlug}.ecohub.local`;
}

/** Localiza aluno para login por PIN — aceita matrícula com caixa diferente. */
export async function findStudentForPinLogin(schoolId: string, enrollmentCode: string) {
  const code = enrollmentCode.trim();
  if (!code) return null;

  const exact = await prisma.student.findFirst({
    where: {
      enrollmentCode: code,
      user: { schoolId, role: "student" },
    },
    include: { user: true },
  });
  if (exact) return exact;

  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT s.id
      FROM "Student" s
      INNER JOIN "User" u ON u.id = s.userId
      WHERE u.schoolId = ${schoolId}
        AND u.role = 'student'
        AND lower(s.enrollmentCode) = ${code.toLowerCase()}
      LIMIT 1
    `;
    const id = rows[0]?.id;
    if (!id) return null;
    return prisma.student.findFirst({
      where: { id },
      include: { user: true },
    });
  } catch (error) {
    console.error("[auth] busca de matrícula para PIN falhou:", error);
    return null;
  }
}
