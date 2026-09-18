import { Prisma } from "@prisma/client";

const PRISMA_MESSAGES: Record<string, string> = {
  P2003: "Referência inválida. Atualize a página e tente novamente.",
  P2021: "Banco desatualizado (tabela ausente). Aguarde o deploy e tente de novo.",
  P2022: "Banco desatualizado (coluna ausente). Aguarde o deploy e tente de novo.",
};

export function formatCrudError(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const targetStr =
        JSON.stringify(error.meta?.target ?? "").toLowerCase() +
        " " +
        error.message.toLowerCase();

      if (targetStr.includes("email")) {
        return "E-mail já cadastrado.";
      }
      if (targetStr.includes("enrollmentcode") || targetStr.includes("student_enrollmentcode")) {
        return "Matrícula já em uso. Escolha ou informe outra matrícula.";
      }
      if (targetStr.includes("username")) {
        return "Nome de usuário já está em uso.";
      }
      if (targetStr.includes("cnpj")) {
        return "CNPJ já cadastrado.";
      }
      if (targetStr.includes("token")) {
        return "Token ou código já utilizado.";
      }
      return "Já existe um registro com esses dados (e-mail, matrícula ou usuário).";
    }

    const mapped = PRISMA_MESSAGES[error.code];
    if (mapped) return mapped;
    console.error(`[prisma] ${error.code}:`, error.message);
  }

  const message = error instanceof Error ? error.message : String(error);
  if (!message) return fallback;

  if (message.includes("Body exceeded") || message.includes("413")) {
    return "Os dados enviados são grandes demais (ex.: foto). Tente sem foto ou com arquivo menor.";
  }
  if (message.toLowerCase().includes("user_email") || message.toLowerCase().includes("email")) {
    return "E-mail já cadastrado.";
  }
  if (message.includes("column") && message.toLowerCase().includes("does not exist")) {
    return "Banco desatualizado. Aguarde 2 minutos após o deploy e tente novamente.";
  }
  if (message.toLowerCase().includes("enrollmentcode") || message.includes("Student_enrollmentCode")) {
    return "Matrícula já em uso.";
  }

  return fallback;
}
