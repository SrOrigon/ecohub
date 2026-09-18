import { prisma } from "@/lib/db";

/** Verifica e-mail sem carregar colunas opcionais (seguro com schema parcial no Postgres). */
export async function userExistsByEmail(email: string, excludeUserId?: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const row = await prisma.user.findFirst({
    where: {
      email: normalized,
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return !!row;
}
