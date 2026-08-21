import { Prisma } from "@prisma/client";

export function formatCrudError(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "E-mail já cadastrado.";
    if (error.code === "P2003") return "Referência inválida. Atualize a página e tente novamente.";
  }

  const message = error instanceof Error ? error.message : String(error);
  if (!message) return fallback;

  if (message.includes("Body exceeded") || message.includes("413")) {
    return "Os dados enviados são grandes demais (ex.: foto). Tente sem foto ou com arquivo menor.";
  }
  if (message.toLowerCase().includes("unique constraint")) {
    return "E-mail já cadastrado.";
  }
  if (message.length < 180 && !message.toLowerCase().includes("prisma")) {
    return message;
  }

  return fallback;
}
