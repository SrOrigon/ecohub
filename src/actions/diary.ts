"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSessionResult } from "@/lib/auth";
import { assertInstitutionSubject } from "@/lib/institution-subjects";
import { getSchoolSettings } from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";
import { notifyStudentParents } from "@/lib/notifications";
import { OCCURRENCE_KINDS } from "@/lib/constants";

function revalidateDiary() {
  revalidatePath("/dashboard/diario");
  revalidatePath("/dashboard/professor");
  revalidatePath("/dashboard/responsavel");
}

async function assertTeacherClass(userId: string, classId: string, schoolId: string) {
  const turma = await prisma.classGroup.findFirst({
    where: { id: classId, schoolId, teacherId: userId },
  });
  if (!turma) throw new Error("Turma não encontrada ou sem permissão.");
  return turma;
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

  if (user.role === "teacher") {
    try {
      await assertTeacherClass(user.id, classId, user.schoolId);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Sem permissão nesta turma." };
    }
  }

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

  if (user.role === "teacher") {
    try {
      await assertTeacherClass(user.id, classId, user.schoolId);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Sem permissão nesta turma." };
    }
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

export async function getOccurrencesForStudent(studentId: string) {
  return prisma.occurrence.findMany({
    where: { studentId },
    include: {
      teacher: { select: { fullName: true } },
      classGroup: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: 20,
  });
}
