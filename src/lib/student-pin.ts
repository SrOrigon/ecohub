import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { BCRYPT_ROUNDS } from "@/lib/security/constants";

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
