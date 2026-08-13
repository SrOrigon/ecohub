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

export function validatePassword(password: string): { ok: true } | { ok: false; error: string } {
  const trimmed = password.trim();
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
