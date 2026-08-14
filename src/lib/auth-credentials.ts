import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { BCRYPT_ROUNDS } from "@/lib/security/constants";
import { hashPassword, verifyPassword } from "@/lib/security/password-policy";

const USER_AUTH_SELECT = {
  id: true,
  email: true,
  passwordHash: true,
  role: true,
  schoolId: true,
  fullName: true,
  avatarUrl: true,
} as const;

export type AuthUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  schoolId: string | null;
  fullName: string;
  avatarUrl: string | null;
};

/** Busca usuário para login — aceita e-mails legados com caixa mista. */
export async function findUserByEmailForLogin(email: string): Promise<AuthUserRecord | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const exact = await prisma.user.findUnique({
    where: { email: normalized },
    select: USER_AUTH_SELECT,
  });
  if (exact) return exact;

  const legacy = await prisma.$queryRaw<AuthUserRecord[]>`
    SELECT id, email, passwordHash, role, schoolId, fullName, avatarUrl
    FROM User
    WHERE lower(email) = ${normalized}
    LIMIT 1
  `;
  const user = legacy[0];
  if (!user) return null;

  if (user.email !== normalized) {
    await prisma.user
      .update({ where: { id: user.id }, data: { email: normalized } })
      .catch(() => undefined);
    return { ...user, email: normalized };
  }

  return user;
}

function shouldUpgradePasswordHash(hash: string): boolean {
  if (!hash || !hash.startsWith("$2")) return true;
  try {
    return bcrypt.getRounds(hash) < BCRYPT_ROUNDS;
  } catch {
    return true;
  }
}

/** Verifica senha e atualiza hash legado para o padrão atual do sistema. */
export async function verifyAndUpgradePassword(
  user: Pick<AuthUserRecord, "id" | "passwordHash">,
  password: string
): Promise<boolean> {
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return false;

  if (shouldUpgradePasswordHash(user.passwordHash)) {
    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  }

  return true;
}
