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
import { validatePassword } from "@/lib/security/password-policy";
import { BCRYPT_ROUNDS } from "@/lib/security/constants";

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

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const parent = await prisma.user.create({
    data: { email, passwordHash, fullName, role: "parent", schoolId: user.schoolId },
  });

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

function revalidateParentPaths() {
  ["/dashboard/responsaveis", "/dashboard/responsavel", "/dashboard/alunos"].forEach((p) =>
    revalidatePath(p)
  );
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

  revalidateParentPaths();
  return {
    success: true,
    enrollmentCode,
    pin,
    fullName,
  };
}
