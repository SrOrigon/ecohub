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

function mergeById<T extends { id: string }>(previous: T[], current: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of previous) map.set(item.id, item);
  for (const item of current) map.set(item.id, item);
  return [...map.values()];
}

function mergeUsers(
  previous: InstitutionalSnapshot["users"],
  current: InstitutionalSnapshot["users"]
): InstitutionalSnapshot["users"] {
  const map = new Map<string, InstitutionalSnapshot["users"][number]>();
  for (const user of previous) map.set(user.email.toLowerCase(), user);
  for (const user of current) map.set(user.email.toLowerCase(), user);
  return [...map.values()];
}

function mergeParentStudents(
  previous: InstitutionalSnapshot["parentStudents"],
  current: InstitutionalSnapshot["parentStudents"]
): InstitutionalSnapshot["parentStudents"] {
  const map = new Map<string, InstitutionalSnapshot["parentStudents"][number]>();
  const key = (link: InstitutionalSnapshot["parentStudents"][number]) =>
    `${link.parentId}:${link.studentId}`;
  for (const link of previous) map.set(key(link), link);
  for (const link of current) map.set(key(link), link);
  return [...map.values()];
}

/** Une snapshot anterior com o estado atual — nunca descarta turmas/alunos já salvos. */
export function mergeInstitutionalSnapshots(
  previous: InstitutionalSnapshot,
  current: InstitutionalSnapshot
): InstitutionalSnapshot {
  const schools = mergeById(previous.schools, current.schools);
  const users = mergeUsers(previous.users, current.users);
  const students = mergeById(previous.students, current.students);
  const classGroups = mergeById(previous.classGroups, current.classGroups);
  const parentStudents = mergeParentStudents(previous.parentStudents, current.parentStudents);
  const teacherInvites = mergeById(previous.teacherInvites ?? [], current.teacherInvites ?? []);

  return {
    version: Math.max(previous.version, current.version),
    savedAt: current.savedAt,
    userCount: Math.max(previous.userCount, users.length),
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
    const current = await buildInstitutionalSnapshot();
    if (current.userCount === 0) return;

    const previous = await loadInstitutionalSnapshot();
    const snapshot = previous ? mergeInstitutionalSnapshots(previous, current) : current;

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
      `[snapshot] Salvo (${reason}): ${snapshot.userCount} usuário(s), ${snapshot.students.length} aluno(s), ${snapshot.classGroups.length} turma(s).`
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
  classGroupsBefore: number;
  classGroupsAfter: number;
}> {
  if (!isSnapshotStorageEnabled()) {
    return {
      restored: false,
      usersBefore: 0,
      usersAfter: 0,
      studentsBefore: 0,
      studentsAfter: 0,
      classGroupsBefore: 0,
      classGroupsAfter: 0,
    };
  }

  const snapshot = await loadInstitutionalSnapshot();
  if (!snapshot) {
    return {
      restored: false,
      usersBefore: 0,
      usersAfter: 0,
      studentsBefore: 0,
      studentsAfter: 0,
      classGroupsBefore: 0,
      classGroupsAfter: 0,
    };
  }

  const usersBefore = await prisma.user.count();
  const studentsBefore = await prisma.student.count();
  const classGroupsBefore = await prisma.classGroup.count();

  const needsRestore =
    usersBefore < snapshot.userCount ||
    studentsBefore < snapshot.students.length ||
    classGroupsBefore < snapshot.classGroups.length;

  if (needsRestore) {
    console.warn(
      `[snapshot] ALERTA: banco degradado (usuários ${usersBefore}/${snapshot.userCount}, alunos ${studentsBefore}/${snapshot.students.length}, turmas ${classGroupsBefore}/${snapshot.classGroups.length}). Restaurando...`
    );
  }

  await applyInstitutionalSnapshot(snapshot);
  await repairMissingClassGroupsFromReferences(snapshot);

  const usersAfter = await prisma.user.count();
  const studentsAfter = await prisma.student.count();
  const classGroupsAfter = await prisma.classGroup.count();

  if (needsRestore || classGroupsAfter > classGroupsBefore) {
    console.log(
      `[snapshot] Sincronização: usuários ${usersBefore}→${usersAfter}, alunos ${studentsBefore}→${studentsAfter}, turmas ${classGroupsBefore}→${classGroupsAfter}.`
    );
  }

  return {
    restored:
      usersAfter > usersBefore ||
      studentsAfter > studentsBefore ||
      classGroupsAfter > classGroupsBefore,
    usersBefore,
    usersAfter,
    studentsBefore,
    studentsAfter,
    classGroupsBefore,
    classGroupsAfter,
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

/** Recria turmas ausentes a partir de classId em alunos/matrículas e do snapshot. */
async function repairMissingClassGroupsFromReferences(snapshot: InstitutionalSnapshot) {
  const snapshotById = new Map(snapshot.classGroups.map((turma) => [turma.id, turma]));
  const missingClassIds = new Set<string>();

  const studentsWithClass = await prisma.student.findMany({
    where: { classId: { not: null } },
    select: { classId: true },
  });
  for (const row of studentsWithClass) {
    if (row.classId) missingClassIds.add(row.classId);
  }

  try {
    const enrollments = await prisma.studentClassEnrollment.findMany({
      select: { classId: true },
      distinct: ["classId"],
    });
    for (const row of enrollments) missingClassIds.add(row.classId);
  } catch {
    /* tabela pode não existir ainda */
  }

  if (missingClassIds.size === 0) return;

  const existing = await prisma.classGroup.findMany({
    where: { id: { in: [...missingClassIds] } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((row) => row.id));
  const orphanIds = [...missingClassIds].filter((id) => !existingIds.has(id));
  if (orphanIds.length === 0) return;

  const defaultSchoolId =
    snapshot.schools[0]?.id ??
    (
      await prisma.school.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } })
    )?.id;

  if (!defaultSchoolId) return;

  for (const classId of orphanIds) {
    const fromSnapshot = snapshotById.get(classId);
    if (fromSnapshot) {
      await prisma.classGroup.create({ data: fromSnapshot });
      continue;
    }

    await prisma.classGroup.create({
      data: {
        id: classId,
        schoolId: defaultSchoolId,
        name: "Turma recuperada",
        gradeLevel: "—",
        year: new Date().getFullYear(),
      },
    });
  }

  console.log(`[snapshot] Turmas reparadas a partir de referências: ${orphanIds.length}.`);
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
