/**
 * Backup institucional no próprio banco (AppMeta) — sobrevive a deploys no Railway Postgres
 * mesmo sem volume em /data.
 */
import { prisma } from "@/lib/db";
import { isManagedPostgres, isPostgresUrl } from "@/lib/database-mode";

const SNAPSHOT_KEY = "INSTITUTIONAL_SNAPSHOT";
const SNAPSHOT_VERSION = 2;

export type InstitutionalSnapshot = {
  version: number;
  savedAt: string;
  userCount: number;
  schools: Awaited<ReturnType<typeof fetchSchools>>;
  users: Awaited<ReturnType<typeof fetchUsers>>;
  students: Awaited<ReturnType<typeof fetchStudents>>;
  classGroups: Awaited<ReturnType<typeof fetchClassGroups>>;
  parentStudents: Awaited<ReturnType<typeof fetchParentStudents>>;
  teacherInvites: Awaited<ReturnType<typeof fetchTeacherInvites>>;
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

async function fetchTeacherInvites() {
  return prisma.teacherInvite.findMany();
}

export function isSnapshotStorageEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const url = process.env.DATABASE_URL?.trim() ?? "";
  return isManagedPostgres() || isPostgresUrl(url);
}

export async function buildInstitutionalSnapshot(): Promise<InstitutionalSnapshot> {
  const [schools, users, students, classGroups, parentStudents, teacherInvites] = await Promise.all([
    fetchSchools(),
    fetchUsers(),
    fetchStudents(),
    fetchClassGroups(),
    fetchParentStudents(),
    fetchTeacherInvites(),
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
    teacherInvites,
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
  studentsBefore: number;
  studentsAfter: number;
}> {
  if (!isSnapshotStorageEnabled()) {
    return { restored: false, usersBefore: 0, usersAfter: 0, studentsBefore: 0, studentsAfter: 0 };
  }

  const snapshot = await loadInstitutionalSnapshot();
  if (!snapshot) {
    return { restored: false, usersBefore: 0, usersAfter: 0, studentsBefore: 0, studentsAfter: 0 };
  }

  const usersBefore = await prisma.user.count();
  const studentsBefore = await prisma.student.count();
  const classGroupsBefore = await prisma.classGroup.count();

  const needsRestore =
    usersBefore < snapshot.userCount ||
    studentsBefore < snapshot.students.length ||
    classGroupsBefore < snapshot.classGroups.length;

  if (!needsRestore) {
    return {
      restored: false,
      usersBefore,
      usersAfter: usersBefore,
      studentsBefore,
      studentsAfter: studentsBefore,
    };
  }

  console.warn(
    `[snapshot] ALERTA: banco degradado (usuários ${usersBefore}/${snapshot.userCount}, alunos ${studentsBefore}/${snapshot.students.length}). Restaurando...`
  );

  await applyInstitutionalSnapshot(snapshot);

  const usersAfter = await prisma.user.count();
  const studentsAfter = await prisma.student.count();
  console.log(
    `[snapshot] Restauração: usuários ${usersBefore}→${usersAfter}, alunos ${studentsBefore}→${studentsAfter}.`
  );
  return {
    restored: usersAfter > usersBefore || studentsAfter > studentsBefore,
    usersBefore,
    usersAfter,
    studentsBefore,
    studentsAfter,
  };
}

async function applyInstitutionalSnapshot(snapshot: InstitutionalSnapshot) {
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
      const existing = await tx.user.findFirst({
        where: { email: user.email },
        select: { id: true },
      });
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

    for (const invite of snapshot.teacherInvites ?? []) {
      const existing = await tx.teacherInvite.findFirst({
        where: { OR: [{ id: invite.id }, { token: invite.token }] },
        select: { id: true },
      });
      if (!existing) {
        await tx.teacherInvite.create({ data: invite });
      }
    }
  });

  await backfillClassEnrollmentsFromLegacyClassId();
}

/** Recria vínculos de turma a partir do campo legado classId após restauração. */
async function backfillClassEnrollmentsFromLegacyClassId() {
  try {
    const students = await prisma.student.findMany({
      where: { classId: { not: null } },
      select: { id: true, classId: true },
    });
    for (const student of students) {
      if (!student.classId) continue;
      await prisma.studentClassEnrollment.upsert({
        where: { studentId_classId: { studentId: student.id, classId: student.classId } },
        create: { studentId: student.id, classId: student.classId, status: "active" },
        update: { status: "active", endedAt: null },
      });
    }
  } catch (error) {
    console.warn("[snapshot] Backfill de matrículas ignorado:", error);
  }
}
