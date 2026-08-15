"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBirthDate } from "@/lib/student-age";
import {
  generateStudentPin,
  hashStudentPin,
  syntheticStudentEmail,
} from "@/lib/student-pin";
import { validatePassword, hashPassword } from "@/lib/security/password-policy";
import { confirmUserPersisted } from "@/lib/persistence-guard";

export async function createParentAction(formData: FormData) {
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "") || null;
  const relation = String(formData.get("relation") ?? "responsavel");

  if (!fullName || !email || !password) return { error: "Nome, e-mail e senha são obrigatórios." };

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) return { error: passwordCheck.error };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "E-mail já cadastrado." };

  const passwordHash = await hashPassword(password);
  const parent = await prisma.user.create({
    data: { email, passwordHash, fullName, role: "parent", schoolId: user.schoolId },
  });

  await confirmUserPersisted(
    (id) => prisma.user.findUnique({ where: { id }, select: { id: true } }),
    parent.id
  );

  if (studentId) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, user: { schoolId: user.schoolId } },
    });
    if (student) {
      await prisma.parentStudent.create({
        data: { parentId: parent.id, studentId, relation },
      });
    }
  }

  revalidateParentPaths();
  return { success: true };
}

export async function linkParentStudentAction(formData: FormData) {
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const parentId = String(formData.get("parentId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const relation = String(formData.get("relation") ?? "responsavel");

  const parent = await prisma.user.findFirst({
    where: { id: parentId, schoolId: user.schoolId, role: "parent" },
  });
  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: user.schoolId } },
  });

  if (!parent || !student) return { error: "Responsável ou aluno não encontrado." };

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    create: { parentId, studentId, relation },
    update: { relation },
  });

  revalidateParentPaths();
  return { success: true };
}

export async function unlinkParentStudentAction(formData: FormData) {
  const user = await requireSession(["admin", "director"]);
  const linkId = String(formData.get("linkId") ?? "");

  const link = await prisma.parentStudent.findFirst({
    where: { id: linkId, parent: { schoolId: user.schoolId } },
  });
  if (!link) return { error: "Vínculo não encontrado." };

  await prisma.parentStudent.delete({ where: { id: linkId } });
  revalidateParentPaths();
  return { success: true };
}

export async function deleteParentAction(formData: FormData) {
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const parentId = String(formData.get("parentId") ?? "");
  if (!parentId) return { error: "Responsável inválido." };

  const parent = await prisma.user.findFirst({
    where: { id: parentId, schoolId: user.schoolId, role: "parent" },
  });
  if (!parent) return { error: "Responsável não encontrado." };

  await prisma.user.delete({ where: { id: parentId } });
  revalidateParentPaths();
  return { success: true };
}

function revalidateParentPaths() {
  ["/dashboard/responsaveis", "/dashboard/responsavel", "/dashboard/alunos", "/dashboard/comunicados"].forEach((p) =>
    revalidatePath(p)
  );
}

/** Responsável vincula filho já matriculado na escola usando o código de matrícula. */
export async function linkChildByEnrollmentAction(formData: FormData) {
  const user = await requireSession(["parent"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const enrollmentCode = String(formData.get("enrollmentCode") ?? "").trim();
  const relation = String(formData.get("relation") ?? "responsavel");

  if (!enrollmentCode) return { error: "Informe a matrícula do aluno." };

  const student = await prisma.student.findFirst({
    where: { enrollmentCode, user: { schoolId: user.schoolId } },
    include: { user: { select: { fullName: true } } },
  });
  if (!student) {
    return { error: "Matrícula não encontrada nesta escola. Confira com a secretaria." };
  }

  const existing = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId: user.id, studentId: student.id } },
  });
  if (existing) {
    return { error: `${student.user.fullName} já está vinculado ao seu perfil.` };
  }

  await prisma.parentStudent.create({
    data: { parentId: user.id, studentId: student.id, relation },
  });

  revalidateParentPaths();
  return { success: true, studentName: student.user.fullName };
}

/** Responsável justifica falta ou atraso do filho. */
export async function justifyAbsenceAction(formData: FormData) {
  const user = await requireSession(["parent"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const attendanceId = String(formData.get("attendanceId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!attendanceId || !studentId) return { error: "Registro inválido." };
  if (note.length < 10) return { error: "Descreva o motivo com pelo menos 10 caracteres." };
  if (note.length > 500) return { error: "Motivo muito longo (máx. 500 caracteres)." };

  const link = await prisma.parentStudent.findFirst({
    where: { parentId: user.id, studentId },
  });
  if (!link) return { error: "Aluno não vinculado ao seu perfil." };

  const attendance = await prisma.attendance.findFirst({
    where: {
      id: attendanceId,
      studentId,
      student: { user: { schoolId: user.schoolId } },
    },
    include: {
      student: {
        include: {
          user: { select: { fullName: true } },
          classGroup: { select: { teacherId: true, name: true } },
        },
      },
    },
  });
  if (!attendance) return { error: "Registro de frequência não encontrado." };

  if (attendance.status !== "absent" && attendance.status !== "late") {
    return { error: "Só é possível justificar faltas ou atrasos." };
  }

  await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      status: "justified",
      justificationNote: note,
      justifiedAt: new Date(),
      justifiedById: user.id,
    },
  });

  const { createNotification } = await import("@/lib/notifications");
  const studentName = attendance.student.user.fullName;
  const dateLabel = attendance.date.toLocaleDateString("pt-BR");
  const message = `${user.fullName} justificou falta de ${studentName} (${dateLabel}): ${note.slice(0, 120)}`;

  const notifyIds = new Set<string>();
  const directors = await prisma.user.findMany({
    where: { schoolId: user.schoolId, role: { in: ["admin", "director"] } },
    select: { id: true },
  });
  directors.forEach((d) => notifyIds.add(d.id));

  const teacherId = attendance.student.classGroup?.teacherId;
  if (teacherId) notifyIds.add(teacherId);

  for (const id of notifyIds) {
    await createNotification(
      id,
      "Falta justificada",
      message,
      `/dashboard/responsavel/filho/${studentId}`
    );
  }

  revalidateParentPaths();
  revalidatePath(`/dashboard/responsavel/filho/${studentId}`);
  revalidatePath("/dashboard/frequencia");
  return { success: true };
}

export async function provisionStudentForParentAction(formData: FormData) {
  const user = await requireSession(["parent"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const birthDateStr = String(formData.get("birthDate") ?? "").trim();
  const classId = String(formData.get("classId") ?? "") || null;
  const relation = String(formData.get("relation") ?? "responsavel");
  let enrollmentCode = String(formData.get("enrollmentCode") ?? "").trim();

  if (!fullName || !birthDateStr) {
    return { error: "Nome e data de nascimento são obrigatórios." };
  }

  const birthDate = parseBirthDate(birthDateStr);
  if (!birthDate) return { error: "Data de nascimento inválida." };

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    select: { slug: true },
  });
  if (!school) return { error: "Escola não encontrada." };

  if (!enrollmentCode) {
    enrollmentCode = `ALU-${Date.now().toString(36).toUpperCase()}`;
  }

  const existingCode = await prisma.student.findUnique({ where: { enrollmentCode } });
  if (existingCode) return { error: "Matrícula já em uso." };

  if (classId) {
    const turma = await prisma.classGroup.findFirst({
      where: { id: classId, schoolId: user.schoolId },
    });
    if (!turma) return { error: "Turma inválida." };
  }

  const pin = generateStudentPin();
  const accessPinHash = await hashStudentPin(pin);
  const email = syntheticStudentEmail(school.slug, enrollmentCode);
  const passwordHash = await bcrypt.hash(pin, 10);

  const studentUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role: "student",
      schoolId: user.schoolId,
      student: {
        create: {
          enrollmentCode,
          classId,
          birthDate,
          accessPinHash,
          accountType: "provisioned",
          provisionedById: user.id,
        },
      },
    },
    include: { student: true },
  });

  await prisma.parentStudent.create({
    data: {
      parentId: user.id,
      studentId: studentUser.student!.id,
      relation,
    },
  });

  await confirmUserPersisted(
    (id) => prisma.user.findUnique({ where: { id }, select: { id: true } }),
    studentUser.id
  );

  revalidateParentPaths();
  return {
    success: true,
    enrollmentCode,
    pin,
    fullName,
  };
}
