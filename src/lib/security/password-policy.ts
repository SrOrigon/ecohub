import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "@/lib/security/constants";

const BLOCKED_PASSWORDS = new Set([
  "demo123",
  "123456",
  "12345678",
  "password",
  "senha123",
  "admin123",
  "qwerty123",
  "ecohub123",
]);

/** Normaliza senha antes de validar, hashear ou comparar. */
export function normalizePassword(password: string): string {
  return password.trim();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(normalizePassword(password), BCRYPT_ROUNDS);
}

/** Compara senha informada com hash — inclui compatibilidade com contas antigas. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const normalized = normalizePassword(password);
  if (await bcrypt.compare(normalized, hash)) return true;
  // Contas criadas antes da normalização podem ter espaços no hash.
  if (normalized !== password && (await bcrypt.compare(password, hash))) return true;
  return false;
}

export function validatePassword(password: string): { ok: true } | { ok: false; error: string } {
  const trimmed = normalizePassword(password);
  if (trimmed.length < 8) {
    return { ok: false, error: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (trimmed.length > 128) {
    return { ok: false, error: "A senha deve ter no máximo 128 caracteres." };
  }
  if (BLOCKED_PASSWORDS.has(trimmed.toLowerCase())) {
    return { ok: false, error: "Senha muito comum. Escolha uma senha mais forte." };
  }
  if (!/[a-zA-Z]/.test(trimmed) || !/[0-9]/.test(trimmed)) {
    return { ok: false, error: "A senha deve conter letras e números." };
  }
  return { ok: true };
}

/** Mensagem genérica para não revelar se e-mail existe. */
export const GENERIC_AUTH_ERROR = "E-mail ou senha inválidos.";
export const GENERIC_REGISTER_ERROR =
  "Não foi possível concluir o cadastro. Verifique os dados ou tente outro e-mail.";
