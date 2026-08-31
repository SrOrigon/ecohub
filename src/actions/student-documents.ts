"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CONTRACT_STATUSES, type ContractStatus } from "@/lib/contract-types";
import { getContractTemplateHtml } from "@/lib/contract-template";
import { applyMergeTags, buildStudentMergeContext, nextContractNumber, stripHtmlToText } from "@/lib/document-merge";
import { getSchoolSettings } from "@/lib/school-settings";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const DOC_ROLES = ["admin", "director", "secretary"] as const;

function parseContractStatus(value: string): ContractStatus | null {
  return CONTRACT_STATUSES.some((item) => item.value === value) ? (value as ContractStatus) : null;
}

function parseDateInput(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function assertDocumentAccess(documentId: string, schoolId: string) {
  return prisma.issuedDocument.findFirst({
    where: { id: documentId, schoolId },
    include: {
      student: { include: { user: { select: { fullName: true } } } },
    },
  });
}

export async function createStudentDocumentAction(formData: FormData): Promise<void> {
  const user = await requireSession([...DOC_ROLES]);
  if (!user.schoolId) return;

  const studentId = String(formData.get("studentId") ?? "").trim();
  const type = String(formData.get("type") ?? "contract").trim();
  const title = String(formData.get("title") ?? "").trim() || "Novo documento";
  const classId = String(formData.get("classId") ?? "").trim() || null;
  const startDate = parseDateInput(String(formData.get("contractStartDate") ?? "")) ?? new Date();
  const endDate = parseDateInput(String(formData.get("contractEndDate") ?? ""));

  if (!studentId) return;

  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: user.schoolId } },
  });
  if (!student) return;

  if (classId) {
    const turma = await prisma.classGroup.findFirst({
      where: { id: classId, schoolId: user.schoolId },
    });
    if (!turma) return;
  }

  const contractNumber = type === "contract" ? await nextContractNumber(user.schoolId) : null;
  const settings = await getSchoolSettings(user.schoolId);
  const templateHtml = getContractTemplateHtml(settings);
  const mergeContext = await buildStudentMergeContext(user.schoolId, studentId, {
    contractNumber,
    classId,
    issuedAt: startDate,
    contractStartDate: startDate,
    contractEndDate: endDate,
  });
  const contentHtml = mergeContext ? applyMergeTags(templateHtml, mergeContext) : templateHtml;
  const body = stripHtmlToText(contentHtml);

  const document = await prisma.issuedDocument.create({
    data: {
      schoolId: user.schoolId,
      studentId,
      classId,
      type,
      title,
      body,
      contentHtml,
      status: "draft",
      contractNumber,
      contractStatus: "rascunho",
      contractStartDate: startDate,
      contractEndDate: endDate,
      issuedById: user.id,
    },
  });

  revalidatePath("/dashboard/documentos");
  revalidatePath("/dashboard/contratos");
  revalidatePath(`/dashboard/alunos/${studentId}`);
  redirect(formData.get("redirectTo") === "contratos" ? "/dashboard/contratos" : `/dashboard/documentos/${document.id}`);
}

export async function saveStudentDocumentAction(
  _prev: { success?: boolean; error?: string } | null,
  formData: FormData
) {
  const user = await requireSession([...DOC_ROLES]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const documentId = String(formData.get("documentId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const contentHtml = String(formData.get("contentHtml") ?? "");
  const contractNumber = String(formData.get("contractNumber") ?? "").trim() || null;
  const classId = String(formData.get("classId") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "draft");
  const contractStartDate = parseDateInput(String(formData.get("contractStartDate") ?? ""));
  const contractEndDate = parseDateInput(String(formData.get("contractEndDate") ?? ""));

  if (!documentId || !title) return { error: "Dados incompletos." };

  const existing = await assertDocumentAccess(documentId, user.schoolId);
  if (!existing) return { error: "Documento não encontrado." };

  const isFinal = status === "final";
  const contractStatus = isFinal
    ? existing.contractStatus === "rascunho" || existing.contractStatus === "vigente"
      ? "vigente"
      : existing.contractStatus
    : "rascunho";

  await prisma.issuedDocument.update({
    where: { id: documentId },
    data: {
      title,
      contentHtml,
      body: stripHtmlToText(contentHtml),
      contractNumber: contractNumber ?? existing.contractNumber,
      classId: classId ?? existing.classId,
      contractStartDate: contractStartDate ?? existing.contractStartDate,
      contractEndDate: contractEndDate ?? existing.contractEndDate,
      status: isFinal ? "final" : "draft",
      contractStatus,
      issuedAt: isFinal && existing.status !== "final" ? new Date() : existing.issuedAt,
    },
  });

  revalidatePath("/dashboard/documentos");
  revalidatePath("/dashboard/contratos");
  revalidatePath(`/dashboard/documentos/${documentId}`);
  revalidatePath(`/dashboard/documentos/${documentId}/imprimir`);
  revalidatePath(`/dashboard/alunos/${existing.studentId}`);

  return { success: true };
}

export async function updateContractStatusAction(formData: FormData): Promise<void> {
  const user = await requireSession([...DOC_ROLES]);
  if (!user.schoolId) return;

  const documentId = String(formData.get("documentId") ?? "").trim();
  const status = parseContractStatus(String(formData.get("contractStatus") ?? ""));
  if (!documentId || !status) return;

  const existing = await assertDocumentAccess(documentId, user.schoolId);
  if (!existing || existing.type !== "contract") return;

  const endedStatuses: ContractStatus[] = ["encerrado", "cancelado"];
  await prisma.issuedDocument.update({
    where: { id: documentId },
    data: {
      contractStatus: status,
      contractEndDate:
        endedStatuses.includes(status) && !existing.contractEndDate ? new Date() : existing.contractEndDate,
      status: status === "rascunho" ? "draft" : existing.status === "draft" ? "final" : existing.status,
    },
  });

  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard/documentos");
  revalidatePath(`/dashboard/documentos/${documentId}`);
}

export async function deleteStudentDocumentAction(formData: FormData): Promise<void> {
  const user = await requireSession([...DOC_ROLES]);
  if (!user.schoolId) return;

  const documentId = String(formData.get("documentId") ?? "").trim();
  if (!documentId) return;

  const existing = await assertDocumentAccess(documentId, user.schoolId);
  if (!existing) return;

  await prisma.issuedDocument.delete({ where: { id: documentId } });

  revalidatePath("/dashboard/documentos");
  revalidatePath("/dashboard/contratos");
  revalidatePath(`/dashboard/alunos/${existing.studentId}`);
  redirect("/dashboard/contratos");
}

export async function duplicateStudentDocumentAction(formData: FormData): Promise<void> {
  const user = await requireSession([...DOC_ROLES]);
  if (!user.schoolId) return;

  const documentId = String(formData.get("documentId") ?? "").trim();
  const existing = await assertDocumentAccess(documentId, user.schoolId);
  if (!existing) return;

  const contractNumber =
    existing.type === "contract" ? await nextContractNumber(user.schoolId) : null;

  const copy = await prisma.issuedDocument.create({
    data: {
      schoolId: existing.schoolId,
      studentId: existing.studentId,
      classId: existing.classId,
      type: existing.type,
      title: `${existing.title} (cópia)`,
      body: existing.body,
      contentHtml: existing.contentHtml,
      status: "draft",
      contractNumber,
      contractStatus: "rascunho",
      contractStartDate: new Date(),
      contractEndDate: existing.contractEndDate,
      issuedById: user.id,
    },
  });

  revalidatePath("/dashboard/documentos");
  revalidatePath("/dashboard/contratos");
  revalidatePath(`/dashboard/alunos/${existing.studentId}`);
  redirect(`/dashboard/documentos/${copy.id}`);
}
