"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { UserRole } from "@/lib/constants";
import { assertInstitutionSubject } from "@/lib/institution-subjects";
import { getSchoolSettings, parseSchoolSettings, stringifySchoolSettings } from "@/lib/school-settings";

const STAFF_ROLES: UserRole[] = ["admin", "director", "secretary", "teacher"];

export async function submitEnrollmentAction(formData: FormData): Promise<void> {
  const schoolSlug = String(formData.get("schoolSlug") ?? "").trim().toLowerCase();
  const studentName = String(formData.get("studentName") ?? "").trim();
  const birthDateStr = String(formData.get("birthDate") ?? "").trim();
  const parentName = String(formData.get("parentName") ?? "").trim();
  const parentEmail = String(formData.get("parentEmail") ?? "").trim().toLowerCase();
  const parentPhone = String(formData.get("parentPhone") ?? "").trim() || null;
  const gradeLevel = String(formData.get("gradeLevel") ?? "").trim();

  if (!schoolSlug || !studentName || !birthDateStr || !parentName || !parentEmail || !gradeLevel) return;

  const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });
  if (!school) return;

  const birthDate = new Date(birthDateStr);
  if (Number.isNaN(birthDate.getTime())) return;

  await prisma.enrollmentApplication.create({
    data: { schoolId: school.id, studentName, birthDate, parentName, parentEmail, parentPhone, gradeLevel },
  });

  redirect(`/inscricao/${schoolSlug}?ok=1`);
}

export async function reviewEnrollmentAction(formData: FormData): Promise<void> {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return;

  const id = String(formData.get("applicationId") ?? "");
  const action = String(formData.get("action") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const app = await prisma.enrollmentApplication.findFirst({
    where: { id, schoolId: user.schoolId },
  });
  if (!app) return;

  await prisma.enrollmentApplication.update({
    where: { id },
    data: {
      status: action === "approve" ? "approved" : "rejected",
      notes,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/matriculas");
}

export async function createAuthorizationFormAction(formData: FormData): Promise<void> {
  const user = await requireSession(STAFF_ROLES);
  if (!user.schoolId) return;

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const classId = String(formData.get("classId") ?? "") || null;
  const deadlineStr = String(formData.get("deadline") ?? "").trim();

  if (!title || !body) return;

  await prisma.authorizationForm.create({
    data: {
      schoolId: user.schoolId,
      classId,
      title,
      body,
      deadline: deadlineStr ? new Date(deadlineStr) : null,
      createdById: user.id,
    },
  });

  revalidatePath("/dashboard/autorizacoes");
}

export async function signAuthorizationAction(formData: FormData): Promise<void> {
  const user = await requireSession(["parent"]);
  const formId = String(formData.get("formId") ?? "");
  const studentId = String(formData.get("studentId") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  const form = await prisma.authorizationForm.findFirst({
    where: { id: formId, schoolId: user.schoolId ?? undefined },
  });
  if (!form) return;

  if (studentId) {
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: user.id, studentId },
    });
    if (!link) return;
  }

  const existing = await prisma.authorizationResponse.findFirst({
    where: { formId, parentId: user.id, studentId: studentId || null },
  });
  if (existing) {
    await prisma.authorizationResponse.update({
      where: { id: existing.id },
      data: { signedAt: new Date(), note },
    });
  } else {
    await prisma.authorizationResponse.create({
      data: { formId, parentId: user.id, studentId: studentId || null, note },
    });
  }

  revalidatePath("/dashboard/autorizacoes");
}

export async function sendChatMessageAction(formData: FormData): Promise<void> {
  const user = await requireSession(["parent", "teacher", "director", "secretary", "admin"]);
  if (!user.schoolId) return;

  const threadId = String(formData.get("threadId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const parentId = String(formData.get("parentId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  let thread = threadId
    ? await prisma.chatThread.findFirst({ where: { id: threadId, schoolId: user.schoolId } })
    : null;

  if (!thread && studentId && parentId) {
    thread = await prisma.chatThread.upsert({
      where: { schoolId_studentId_parentId: { schoolId: user.schoolId, studentId, parentId } },
      create: { schoolId: user.schoolId, studentId, parentId },
      update: { updatedAt: new Date() },
    });
  }

  if (!thread) return;

  await prisma.chatMessage.create({
    data: { threadId: thread.id, senderId: user.id, body },
  });
  await prisma.chatThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });

  revalidatePath("/dashboard/mensagens");
  redirect(`/dashboard/mensagens?thread=${thread.id}`);
}

export async function issueDocumentAction(formData: FormData): Promise<void> {
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return;

  const studentId = String(formData.get("studentId") ?? "");
  const type = String(formData.get("type") ?? "declaration");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!studentId || !title || !body) return;

  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: user.schoolId } },
  });
  if (!student) return;

  await prisma.issuedDocument.create({
    data: { schoolId: user.schoolId, studentId, type, title, body, issuedById: user.id },
  });

  revalidatePath("/dashboard/documentos");
}

export async function votePollAction(formData: FormData): Promise<void> {
  const user = await requireSession(["admin", "director", "teacher", "student", "parent", "secretary"]);
  const pollId = String(formData.get("pollId") ?? "");
  const optionId = String(formData.get("optionId") ?? "");
  if (!pollId || !optionId) return;

  await prisma.announcementPollVote.upsert({
    where: { pollId_userId: { pollId, userId: user.id } },
    create: { pollId, optionId, userId: user.id },
    update: { optionId, votedAt: new Date() },
  });

  revalidatePath("/dashboard/comunicados");
}

export async function closePeriodAction(formData: FormData): Promise<void> {
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return;

  const period = String(formData.get("period") ?? "").trim();
  if (!period) return;

  const school = await prisma.school.findUnique({ where: { id: user.schoolId } });
  if (!school) return;

  const current = parseSchoolSettings(school.settings);
  if (!current.gradeRules.closedPeriods.includes(period)) {
    current.gradeRules.closedPeriods.push(period);
  }

  await prisma.school.update({
    where: { id: user.schoolId },
    data: { settings: stringifySchoolSettings(current) },
  });

  revalidatePath("/dashboard/configuracoes");
  revalidatePath("/dashboard/notas");
}

export async function saveScheduleSlotAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const user = await requireSession(STAFF_ROLES);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  const classId = String(formData.get("classId") ?? "");
  const weekday = Number(formData.get("weekday") ?? 1);
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const room = String(formData.get("room") ?? "").trim() || null;

  if (!classId || !startTime || !endTime || !subject) {
    return { error: "Preencha turma, horários e disciplina." };
  }

  const subjectCheck = assertInstitutionSubject(subject, settings.academic.subjects);
  if (!subjectCheck.ok) return { error: subjectCheck.error };

  await prisma.classScheduleSlot.create({
    data: { schoolId: user.schoolId, classId, weekday, startTime, endTime, subject, room },
  });

  revalidatePath("/dashboard/horarios");
  return { success: true };
}

export async function exportGradesCsvAction(): Promise<{ csv?: string; error?: string }> {
  const user = await requireSession(STAFF_ROLES);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const grades = await prisma.grade.findMany({
    where: { student: { user: { schoolId: user.schoolId } } },
    include: { student: { include: { user: { select: { fullName: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const header = "Aluno,Disciplina,Nota,Período,Data";
  const rows = grades.map(
    (g) =>
      `"${g.student.user.fullName}","${g.subject}",${g.value},"${g.period}",${g.createdAt.toISOString().slice(0, 10)}`
  );
  return { csv: [header, ...rows].join("\n") };
}
