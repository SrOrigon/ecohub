import { prisma } from "@/lib/db";

export type ResetUserResult =
  | { ok: true; found: false }
  | { ok: true; found: true; removedSchool: boolean; removedUsers: number; email: string }
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
    const deletedUsers = await prisma.user.deleteMany({ where: { schoolId: user.schoolId } });
    await prisma.school.delete({ where: { id: user.schoolId! } });
    return {
      ok: true,
      found: true,
      removedSchool: true,
      removedUsers: deletedUsers.count,
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
