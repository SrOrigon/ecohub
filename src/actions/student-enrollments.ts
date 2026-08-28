"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertClassInScope, assertStudentInScope } from "@/lib/tenant-guards";
import {
  enrollStudentInClass,
  ENROLLMENT_STATUSES,
  removeStudentFromClass,
  setStudentEnrollmentStatus,
  type EnrollmentStatus,
} from "@/lib/student-enrollments";
import { revalidatePath } from "next/cache";

const ENROLLMENT_ROLES = ["admin", "director", "secretary", "teacher"] as const;

function parseEnrollmentStatus(value: string): EnrollmentStatus | null {
  return ENROLLMENT_STATUSES.some((item) => item.value === value)
    ? (value as EnrollmentStatus)
    : null;
}

export async function enrollStudentInClassAction(formData: FormData) {
  const user = await requireSession([...ENROLLMENT_ROLES]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const studentId = String(formData.get("studentId") ?? "").trim();
  const classId = String(formData.get("classId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!studentId || !classId) return { error: "Selecione aluno e turma." };

  const scope = await assertClassInScope(user, classId);
  if (!scope.ok) return { error: scope.error };

  const studentScope = await assertStudentInScope(user, studentId);
  if (!studentScope.ok) return { error: studentScope.error };

  const turma = await prisma.classGroup.findFirst({
    where: { id: classId, schoolId: user.schoolId },
    select: { id: true },
  });
  if (!turma) return { error: "Turma não encontrada." };

  await enrollStudentInClass(studentId, classId, { notes });

  revalidatePath("/dashboard/alunos");
  revalidatePath(`/dashboard/alunos/${studentId}`);
  revalidatePath("/dashboard/turmas");
  revalidatePath("/dashboard/frequencia");
  return { success: true };
}

export async function updateStudentEnrollmentStatusAction(formData: FormData) {
  const user = await requireSession([...ENROLLMENT_ROLES]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const studentId = String(formData.get("studentId") ?? "").trim();
  const classId = String(formData.get("classId") ?? "").trim();
  const status = parseEnrollmentStatus(String(formData.get("status") ?? ""));

  if (!studentId || !classId || !status) return { error: "Dados inválidos." };

  const studentScope = await assertStudentInScope(user, studentId);
  if (!studentScope.ok) return { error: studentScope.error };

  const enrollment = await prisma.studentClassEnrollment.findFirst({
    where: {
      studentId,
      classId,
      student: { user: { schoolId: user.schoolId } },
    },
    select: { id: true },
  });
  if (!enrollment) return { error: "Matrícula não encontrada." };

  await setStudentEnrollmentStatus(studentId, classId, status);

  revalidatePath("/dashboard/alunos");
  revalidatePath(`/dashboard/alunos/${studentId}`);
  revalidatePath("/dashboard/turmas");
  return { success: true };
}

export async function removeStudentFromClassAction(formData: FormData) {
  const user = await requireSession([...ENROLLMENT_ROLES]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const studentId = String(formData.get("studentId") ?? "").trim();
  const classId = String(formData.get("classId") ?? "").trim();

  if (!studentId || !classId) return { error: "Dados inválidos." };

  const studentScope = await assertStudentInScope(user, studentId);
  if (!studentScope.ok) return { error: studentScope.error };

  const classScope = await assertClassInScope(user, classId);
  if (!classScope.ok) return { error: classScope.error };

  const linked = await prisma.student.findFirst({
    where: {
      id: studentId,
      user: { schoolId: user.schoolId },
      OR: [
        { classId },
        { classEnrollments: { some: { classId, status: { in: ["active", "locked"] } } } },
      ],
    },
    select: { id: true },
  });
  if (!linked) return { error: "Aluno não está nesta turma." };

  await removeStudentFromClass(studentId, classId);

  revalidatePath("/dashboard/alunos");
  revalidatePath(`/dashboard/alunos/${studentId}`);
  revalidatePath("/dashboard/turmas");
  revalidatePath("/dashboard/frequencia");
  return { success: true };
}
