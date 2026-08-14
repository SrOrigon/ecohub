import { prisma } from "@/lib/db";
import { normalizeCnpj } from "@/lib/cnpj";
import { hashPassword, normalizePassword } from "@/lib/security/password-policy";

export type ResetUserResult =
  | { ok: true; found: false }
  | { ok: true; found: true; removedSchool: boolean; removedUsers: number; email: string }
  | { ok: false; error: string };

export type RepairPasswordResult =
  | { ok: true; found: false }
  | { ok: true; found: true; email: string }
  | { ok: false; error: string };

/** Remove usuário e instituição vinculada (se diretor) para permitir novo cadastro. */
export async function resetUserByEmail(rawEmail: string): Promise<ResetUserResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "E-mail inválido." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      schoolId: true,
      school: { select: { id: true, name: true, slug: true, cnpj: true } },
    },
  });

  if (!user) {
    return { ok: true, found: false };
  }

  const isInstitutionOwner =
    !!user.schoolId && (user.role === "director" || user.role === "admin");

  if (isInstitutionOwner) {
    const removedUsers = await deleteSchoolAndUsers(user.schoolId!);
    return {
      ok: true,
      found: true,
      removedSchool: true,
      removedUsers,
      email,
    };
  }

  await prisma.user.delete({ where: { id: user.id } });
  return {
    ok: true,
    found: true,
    removedSchool: false,
    removedUsers: 1,
    email,
  };
}

async function deleteSchoolAndUsers(schoolId: string) {
  const deletedUsers = await prisma.user.deleteMany({ where: { schoolId } });
  await prisma.school.delete({ where: { id: schoolId } });
  return deletedUsers.count;
}

/** Remove instituição pelo CNPJ (libera CNPJ e todos os usuários vinculados). */
export async function resetUserByCnpj(rawCnpj: string): Promise<ResetUserResult> {
  const cnpj = normalizeCnpj(rawCnpj);
  if (cnpj.length < 14) return { ok: false, error: "CNPJ inválido." };

  const school = await prisma.school.findUnique({
    where: { cnpj },
    select: {
      id: true,
      name: true,
      users: { where: { role: "director" }, select: { email: true }, take: 1 },
    },
  });

  if (!school) return { ok: true, found: false };

  const email = school.users[0]?.email ?? `cnpj:${cnpj}`;
  const removedUsers = await deleteSchoolAndUsers(school.id);
  return {
    ok: true,
    found: true,
    removedSchool: true,
    removedUsers,
    email,
  };
}

/** Corrige hash de senha sem apagar cadastro (quando CNPJ já está em uso). */
export async function repairUserPassword(
  rawEmail: string,
  rawPassword: string
): Promise<RepairPasswordResult> {
  const email = rawEmail.trim().toLowerCase();
  const password = normalizePassword(rawPassword);

  if (!email || !email.includes("@")) return { ok: false, error: "E-mail inválido." };
  if (password.length < 8) return { ok: false, error: "Senha inválida." };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { ok: true, found: false };

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { ok: true, found: true, email };
}
