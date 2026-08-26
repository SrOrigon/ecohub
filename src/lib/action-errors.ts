import { Prisma } from "@prisma/client";

const PRISMA_MESSAGES: Record<string, string> = {
  P2002: "E-mail já cadastrado.",
  P2003: "Referência inválida. Atualize a página e tente novamente.",
  P2021: "Banco desatualizado (tabela ausente). Aguarde o deploy e tente de novo.",
  P2022: "Banco desatualizado (coluna ausente). Aguarde o deploy e tente de novo.",
};

export function formatCrudError(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = PRISMA_MESSAGES[error.code];
    if (mapped) return mapped;
    console.error(`[prisma] ${error.code}:`, error.message);
  }

  const message = error instanceof Error ? error.message : String(error);
  if (!message) return fallback;

  if (message.includes("Body exceeded") || message.includes("413")) {
    return "Os dados enviados são grandes demais (ex.: foto). Tente sem foto ou com arquivo menor.";
  }
  if (message.toLowerCase().includes("unique constraint")) {
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
