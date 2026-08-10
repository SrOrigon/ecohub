import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

export function generateStudentPin(): string {
  return String(randomInt(100000, 999999));
}

export async function hashStudentPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyStudentPin(pin: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash || !pin) return false;
  return bcrypt.compare(pin, hash);
}

export function syntheticStudentEmail(schoolSlug: string, enrollmentCode: string): string {
  const safeSlug = schoolSlug.replace(/[^a-z0-9-]/g, "");
  const safeCode = enrollmentCode.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `aluno.${safeCode}@${safeSlug}.eduhub.local`;
}
