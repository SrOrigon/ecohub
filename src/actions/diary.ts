"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSessionResult } from "@/lib/auth";
import { assertInstitutionSubject } from "@/lib/institution-subjects";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";
import { notifyStudentParents } from "@/lib/notifications";
import { OCCURRENCE_KINDS } from "@/lib/constants";
import { assertClassInScope } from "@/lib/tenant-guards";
import { studentsInClassWhere } from "@/lib/student-enrollments";

function revalidateDiary() {
  revalidatePath("/dashboard/diario");
  revalidatePath("/dashboard/professor");
  revalidatePath("/dashboard/responsavel");
}


export async function createDiaryEntryAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director", "teacher"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.manageDiary")) {
    return { error: "Sem permissão para registrar diário." };
  }

  const classId = formData.get("classId")?.toString();
  const content = formData.get("content")?.toString().trim();
  const subject = formData.get("subject")?.toString().trim() || null;
  const dateStr = formData.get("date")?.toString();

  if (!classId || !content || !dateStr) return { error: "Preencha turma, data e conteúdo." };

  if (subject) {
    const subjectCheck = assertInstitutionSubject(subject, settings.academic.subjects);
    if (!subjectCheck.ok) return { error: subjectCheck.error };
  }

  const scope = await assertClassInScope(user, classId);
  if (!scope.ok) return { error: scope.error };

  await prisma.classDiaryEntry.create({
    data: {
      classId,
      teacherId: user.id,
      date: new Date(dateStr),
      subject,
      content,
    },
  });

  revalidateDiary();
  return { success: true };
}

export async function createOccurrenceAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director", "teacher"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.manageDiary")) {
    return { error: "Sem permissão para registrar ocorrências." };
  }

  const classId = formData.get("classId")?.toString();
  const studentId = formData.get("studentId")?.toString() || null;
  const kind = formData.get("kind")?.toString() ?? "observation";
  const description = formData.get("description")?.toString().trim();
  const dateStr = formData.get("date")?.toString();

  if (!classId || !description) return { error: "Preencha turma e descrição." };
  if (!OCCURRENCE_KINDS.includes(kind as (typeof OCCURRENCE_KINDS)[number])) {
    return { error: "Tipo de ocorrência inválido." };
  }

  const scope = await assertClassInScope(user, classId);
  if (!scope.ok) return { error: scope.error };

  if (studentId) {
    // O aluno precisa estar matriculado na turma informada.
    const enrolled = await prisma.student.findFirst({
      where: { id: studentId, ...studentsInClassWhere(classId), user: { schoolId: user.schoolId } },
      select: { id: true },
    });
    if (!enrolled) return { error: "Aluno não pertence a esta turma." };
  }

  const occurrence = await prisma.occurrence.create({
    data: {
      classId,
      studentId,
      teacherId: user.id,
      kind,
      description,
      date: dateStr ? new Date(dateStr) : new Date(),
    },
  });

  if (studentId && settings.diary.notifyParentsOnOccurrence) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: { select: { fullName: true } } },
    });
    if (student) {
      await notifyStudentParents(
        studentId,
        "Nova ocorrência escolar",
        `${student.user.fullName}: ${description.slice(0, 120)}`,
        "/dashboard/responsavel",
        "general"
      );
    }
  }

  revalidateDiary();
  return { success: true, id: occurrence.id };
}

export async function getDiaryForClass(classId: string, schoolId: string) {
  return prisma.classDiaryEntry.findMany({
    where: { classId, classGroup: { schoolId } },
    include: { teacher: { select: { fullName: true } } },
    orderBy: { date: "desc" },
    take: 30,
  });
}

export async function getOccurrencesForClass(classId: string, schoolId: string) {
  return prisma.occurrence.findMany({
    where: { classId, classGroup: { schoolId } },
    include: {
      student: { include: { user: { select: { fullName: true } } } },
      teacher: { select: { fullName: true } },
    },
    orderBy: { date: "desc" },
    take: 30,
  });
}

export async function getOccurrencesForStudent(studentId: string, schoolId: string) {
  return prisma.occurrence.findMany({
    where: { studentId, classGroup: { schoolId } },
    include: {
      teacher: { select: { fullName: true } },
      classGroup: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: 20,
  });
}

export async function deleteDiaryEntryAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director", "teacher"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  if (!user.schoolId) return { error: "Escola não configurada." };

  const entryId = String(formData.get("entryId") ?? "");
  if (!entryId) return { error: "Registro inválido." };

  const entry = await prisma.classDiaryEntry.findFirst({
    where: { id: entryId, classGroup: { schoolId: user.schoolId } },
    select: { id: true, classId: true, teacherId: true },
  });
  if (!entry) return { error: "Registro não encontrado." };

  const scope = await assertClassInScope(user, entry.classId);
  if (!scope.ok) return { error: scope.error };
  if (user.role === "teacher" && entry.teacherId !== user.id) {
    return { error: "Sem permissão para excluir este registro." };
  }

  await prisma.classDiaryEntry.delete({ where: { id: entryId } });
  revalidateDiary();
  return { success: true };
}

export async function deleteOccurrenceAction(formData: FormData) {
  const session = await requireSessionResult(["admin", "director", "teacher"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  if (!user.schoolId) return { error: "Escola não configurada." };

  const occurrenceId = String(formData.get("occurrenceId") ?? "");
  if (!occurrenceId) return { error: "Ocorrência inválida." };

  const occurrence = await prisma.occurrence.findFirst({
    where: { id: occurrenceId, classGroup: { schoolId: user.schoolId } },
    select: { id: true, classId: true, teacherId: true },
  });
  if (!occurrence) return { error: "Ocorrência não encontrada." };

  const scope = await assertClassInScope(user, occurrence.classId);
  if (!scope.ok) return { error: scope.error };
  if (user.role === "teacher" && occurrence.teacherId !== user.id) {
    return { error: "Sem permissão para excluir esta ocorrência." };
  }

  await prisma.occurrence.delete({ where: { id: occurrenceId } });
  revalidateDiary();
  return { success: true };
}
