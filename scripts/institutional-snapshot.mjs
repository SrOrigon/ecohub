#!/usr/bin/env node
/**
 * Backup e restauração institucional via AppMeta (PostgreSQL).
 * Usado no startup de produção e após cadastros críticos.
 */
import { PrismaClient } from "@prisma/client";
import { isPostgresUrl } from "./lib/database-mode.mjs";

const SNAPSHOT_KEY = "INSTITUTIONAL_SNAPSHOT";

function enabled() {
  return process.env.NODE_ENV === "production" && isPostgresUrl(process.env.DATABASE_URL);
}

async function buildSnapshot(prisma) {
  const [schools, users, students, classGroups, parentStudents, teacherInvites] = await Promise.all([
    prisma.school.findMany(),
    prisma.user.findMany({
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
    }),
    prisma.student.findMany(),
    prisma.classGroup.findMany(),
    prisma.parentStudent.findMany(),
    prisma.teacherInvite.findMany(),
  ]);
  return {
    version: 2,
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

function mergeById(previous, current) {
  const map = new Map();
  for (const item of previous) map.set(item.id, item);
  for (const item of current) map.set(item.id, item);
  return [...map.values()];
}

function mergeUsers(previous, current) {
  const map = new Map();
  for (const user of previous) map.set(user.email.toLowerCase(), user);
  for (const user of current) map.set(user.email.toLowerCase(), user);
  return [...map.values()];
}

function mergeParentStudents(previous, current) {
  const map = new Map();
  const key = (link) => `${link.parentId}:${link.studentId}`;
  for (const link of previous) map.set(key(link), link);
  for (const link of current) map.set(key(link), link);
  return [...map.values()];
}

function mergeSnapshots(previous, current) {
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

export async function saveInstitutionalSnapshot(reason = "write") {
  if (!enabled()) return { saved: false };

  const prisma = new PrismaClient();
  try {
    const current = await buildSnapshot(prisma);
    if (current.userCount === 0) return { saved: false };

    const row = await prisma.appMeta.findUnique({ where: { key: SNAPSHOT_KEY } });
    const previous = row?.value ? JSON.parse(row.value) : null;
    const snapshot = previous?.users?.length ? mergeSnapshots(previous, current) : current;

    await prisma.appMeta.upsert({
      where: { key: SNAPSHOT_KEY },
      create: { key: SNAPSHOT_KEY, value: JSON.stringify(snapshot) },
      update: { value: JSON.stringify(snapshot) },
    });

    console.log(
      `[snapshot] Salvo (${reason}): ${snapshot.userCount} usuário(s), ${snapshot.students.length} aluno(s), ${snapshot.classGroups.length} turma(s).`
    );
    return { saved: true, userCount: snapshot.userCount };
  } finally {
    await prisma.$disconnect();
  }
}

async function repairMissingClassGroups(prisma, snapshot) {
  const snapshotById = new Map(snapshot.classGroups.map((turma) => [turma.id, turma]));
  const missingClassIds = new Set();

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
    /* opcional */
  }

  if (missingClassIds.size === 0) return 0;

  const existing = await prisma.classGroup.findMany({
    where: { id: { in: [...missingClassIds] } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((row) => row.id));
  const orphanIds = [...missingClassIds].filter((id) => !existingIds.has(id));
  if (orphanIds.length === 0) return 0;

  const defaultSchoolId =
    snapshot.schools[0]?.id ??
    (await prisma.school.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } }))?.id;
  if (!defaultSchoolId) return 0;

  for (const classId of orphanIds) {
    const fromSnapshot = snapshotById.get(classId);
    if (fromSnapshot) {
      await prisma.classGroup.create({ data: fromSnapshot });
    } else {
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
  }

  return orphanIds.length;
}

async function backfillEnrollments(prisma) {
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
  } catch {
    /* opcional */
  }
}

export async function restoreInstitutionalSnapshotIfDegraded() {
  if (!enabled()) return { restored: false, usersBefore: 0, usersAfter: 0 };

  const prisma = new PrismaClient();
  try {
    const row = await prisma.appMeta.findUnique({ where: { key: SNAPSHOT_KEY } });
    if (!row?.value) return { restored: false, usersBefore: 0, usersAfter: 0 };

    const snapshot = JSON.parse(row.value);
    if (!snapshot?.users?.length) return { restored: false, usersBefore: 0, usersAfter: 0 };

    const usersBefore = await prisma.user.count();
    const studentsBefore = await prisma.student.count();
    const classGroupsBefore = await prisma.classGroup.count();

    const needsRestore =
      usersBefore < snapshot.userCount ||
      studentsBefore < snapshot.students.length ||
      classGroupsBefore < snapshot.classGroups.length;

    if (needsRestore) {
      console.warn(
        `[snapshot] ALERTA: usuários ${usersBefore}/${snapshot.userCount}, alunos ${studentsBefore}/${snapshot.students.length}, turmas ${classGroupsBefore}/${snapshot.classGroups.length}. Restaurando...`
      );
    }

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
        if (!existing) await tx.school.create({ data: school });
      }

      for (const user of snapshot.users) {
        const existing = await tx.user.findFirst({
          where: { email: user.email },
          select: { id: true },
        });
        if (!existing) await tx.user.create({ data: user });
      }

      for (const turma of snapshot.classGroups) {
        const existing = await tx.classGroup.findUnique({ where: { id: turma.id } });
        if (!existing) await tx.classGroup.create({ data: turma });
      }

      for (const student of snapshot.students) {
        const byId = await tx.student.findUnique({ where: { id: student.id } });
        const byCode = await tx.student.findUnique({
          where: { enrollmentCode: student.enrollmentCode },
        });
        if (!byId && !byCode) await tx.student.create({ data: student });
      }

      for (const link of snapshot.parentStudents) {
        const existing = await tx.parentStudent.findFirst({
          where: { parentId: link.parentId, studentId: link.studentId },
        });
        if (!existing) await tx.parentStudent.create({ data: link });
      }

      for (const invite of snapshot.teacherInvites ?? []) {
        const existing = await tx.teacherInvite.findFirst({
          where: { OR: [{ id: invite.id }, { token: invite.token }] },
          select: { id: true },
        });
        if (!existing) await tx.teacherInvite.create({ data: invite });
      }
    });

    await repairMissingClassGroups(prisma, snapshot);
    await backfillEnrollments(prisma);

    const usersAfter = await prisma.user.count();
    const studentsAfter = await prisma.student.count();
    const classGroupsAfter = await prisma.classGroup.count();
    console.log(
      `[snapshot] Sincronização: ${usersBefore}→${usersAfter} usuário(s), ${studentsBefore}→${studentsAfter} aluno(s), ${classGroupsBefore}→${classGroupsAfter} turma(s).`
    );
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
  } finally {
    await prisma.$disconnect();
  }
}

const isMain = process.argv[1]?.replace(/\\/g, "/").includes("institutional-snapshot");

if (isMain) {
  const cmd = process.argv[2] ?? "restore";
  if (cmd === "save") {
    saveInstitutionalSnapshot("cli").catch((e) => {
      console.error(e);
      process.exit(1);
    });
  } else {
    restoreInstitutionalSnapshotIfDegraded().catch((e) => {
      console.error(e);
      process.exit(1);
    });
  }
}
