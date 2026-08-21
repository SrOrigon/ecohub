/**
 * Backup institucional no próprio banco (AppMeta) — sobrevive a deploys no Railway Postgres
 * mesmo sem volume em /data.
 */
import { prisma } from "@/lib/db";
import { isManagedPostgres, isPostgresUrl } from "@/lib/database-mode";

const SNAPSHOT_KEY = "INSTITUTIONAL_SNAPSHOT";
const SNAPSHOT_VERSION = 1;

export type InstitutionalSnapshot = {
  version: number;
  savedAt: string;
  userCount: number;
  schools: Awaited<ReturnType<typeof fetchSchools>>;
  users: Awaited<ReturnType<typeof fetchUsers>>;
  students: Awaited<ReturnType<typeof fetchStudents>>;
  classGroups: Awaited<ReturnType<typeof fetchClassGroups>>;
  parentStudents: Awaited<ReturnType<typeof fetchParentStudents>>;
};

async function fetchSchools() {
  return prisma.school.findMany();
}

async function fetchUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      passwordHash: true,
      fullName: true,
      role: true,
      avatarUrl: true,
      displayName: true,
      username: true,
      phone: true,
      gender: true,
      pronouns: true,
      bio: true,
      interests: true,
      socialLinks: true,
      city: true,
      state: true,
      zipCode: true,
      latitude: true,
      longitude: true,
      schoolId: true,
      createdAt: true,
    },
  });
}

async function fetchStudents() {
  return prisma.student.findMany();
}

async function fetchClassGroups() {
  return prisma.classGroup.findMany();
}

async function fetchParentStudents() {
  return prisma.parentStudent.findMany();
}

export function isSnapshotStorageEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const url = process.env.DATABASE_URL?.trim() ?? "";
  return isManagedPostgres() || isPostgresUrl(url);
}

export async function buildInstitutionalSnapshot(): Promise<InstitutionalSnapshot> {
  const [schools, users, students, classGroups, parentStudents] = await Promise.all([
    fetchSchools(),
    fetchUsers(),
    fetchStudents(),
    fetchClassGroups(),
    fetchParentStudents(),
  ]);

  return {
    version: SNAPSHOT_VERSION,
    savedAt: new Date().toISOString(),
    userCount: users.length,
    schools,
    users,
    students,
    classGroups,
    parentStudents,
  };
}

/** Grava snapshot após cadastros críticos (contas, turmas, vínculos). */
export async function saveInstitutionalSnapshot(reason = "write"): Promise<void> {
  if (!isSnapshotStorageEnabled()) return;

  try {
    const snapshot = await buildInstitutionalSnapshot();
    if (snapshot.userCount === 0) return;

    await prisma.appMeta.upsert({
      where: { key: SNAPSHOT_KEY },
      create: {
        key: SNAPSHOT_KEY,
        value: JSON.stringify(snapshot),
      },
      update: {
        value: JSON.stringify(snapshot),
      },
    });

    console.log(
      `[snapshot] Salvo (${reason}): ${snapshot.userCount} usuário(s), ${snapshot.schools.length} escola(s).`
    );
  } catch (error) {
    console.error("[snapshot] Falha ao salvar backup institucional:", error);
  }
}

export async function loadInstitutionalSnapshot(): Promise<InstitutionalSnapshot | null> {
  try {
    const row = await prisma.appMeta.findUnique({ where: { key: SNAPSHOT_KEY } });
    if (!row?.value) return null;
    const parsed = JSON.parse(row.value) as InstitutionalSnapshot;
    if (!parsed?.users?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Restaura contas ausentes quando o banco perdeu registros (ex.: migração incorreta).
 * Nunca apaga dados existentes — só complementa por e-mail / matrícula / slug.
 */
export async function restoreInstitutionalSnapshotIfDegraded(): Promise<{
  restored: boolean;
  usersBefore: number;
  usersAfter: number;
}> {
  if (!isSnapshotStorageEnabled()) {
    return { restored: false, usersBefore: 0, usersAfter: 0 };
  }

  const snapshot = await loadInstitutionalSnapshot();
  if (!snapshot) {
    return { restored: false, usersBefore: 0, usersAfter: 0 };
  }

  const usersBefore = await prisma.user.count();
  if (usersBefore >= snapshot.userCount) {
    return { restored: false, usersBefore, usersAfter: usersBefore };
  }

  console.warn(
    `[snapshot] ALERTA: ${usersBefore} usuário(s) no banco, snapshot tem ${snapshot.userCount}. Restaurando...`
  );

  await prisma.$transaction(async (tx) => {
    for (const school of snapshot.schools) {
      const existing = await tx.school.findFirst({
        where: {
          OR: [
            { id: school.id },
            ...(school.slug ? [{ slug: school.slug }] : []),
            ...(school.cnpj ? [{ cnpj: school.cnpj }] : []),
          ],
        },
      });
      if (!existing) {
        await tx.school.create({ data: school });
      }
    }

    for (const user of snapshot.users) {
      const existing = await tx.user.findUnique({ where: { email: user.email } });
      if (!existing) {
        await tx.user.create({ data: user });
      }
    }

    for (const turma of snapshot.classGroups) {
      const existing = await tx.classGroup.findUnique({ where: { id: turma.id } });
      if (!existing) {
        await tx.classGroup.create({ data: turma });
      }
    }

    for (const student of snapshot.students) {
      const byId = await tx.student.findUnique({ where: { id: student.id } });
      const byCode = await tx.student.findUnique({
        where: { enrollmentCode: student.enrollmentCode },
      });
      if (!byId && !byCode) {
        await tx.student.create({ data: student });
      }
    }

    for (const link of snapshot.parentStudents) {
      const existing = await tx.parentStudent.findFirst({
        where: { parentId: link.parentId, studentId: link.studentId },
      });
      if (!existing) {
        await tx.parentStudent.create({ data: link });
      }
    }
  });

  const usersAfter = await prisma.user.count();
  console.log(`[snapshot] Restauração concluída: ${usersBefore} → ${usersAfter} usuário(s).`);
  return { restored: usersAfter > usersBefore, usersBefore, usersAfter };
}
