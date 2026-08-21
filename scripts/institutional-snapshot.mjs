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

export async function saveInstitutionalSnapshot(reason = "write") {
  if (!enabled()) return { saved: false };

  const prisma = new PrismaClient();
  try {
    const snapshot = await buildSnapshot(prisma);
    if (snapshot.userCount === 0) return { saved: false };

    await prisma.appMeta.upsert({
      where: { key: SNAPSHOT_KEY },
      create: { key: SNAPSHOT_KEY, value: JSON.stringify(snapshot) },
      update: { value: JSON.stringify(snapshot) },
    });

    console.log(
      `[snapshot] Salvo (${reason}): ${snapshot.userCount} usuário(s), ${snapshot.schools.length} escola(s).`
    );
    return { saved: true, userCount: snapshot.userCount };
  } finally {
    await prisma.$disconnect();
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

    const usersAfter = await prisma.user.count();
    console.log(`[snapshot] Restauração: ${usersBefore} → ${usersAfter} usuário(s).`);
    return { restored: usersAfter > usersBefore, usersBefore, usersAfter };
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
