"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { prepareImportedContractHtml } from "@/lib/contract-template";
import { importDocxToHtml } from "@/lib/docx-io";
import {
  getSchoolSettings,
  mergeSchoolSettings,
  stringifySchoolSettings,
} from "@/lib/school-settings";
import { invalidateSchoolCaches } from "@/lib/runtime-cache";
import { revalidatePath } from "next/cache";

const DOC_ROLES = ["admin", "director", "secretary"] as const;

async function persistContractTemplate(
  schoolId: string,
  html: string | null,
  sourceName: string | null
) {
  const settings = await getSchoolSettings(schoolId);
  const merged = mergeSchoolSettings(settings, {
    documents: {
      contractTemplateHtml: html,
      contractTemplateSourceName: sourceName,
      contractTemplateUpdatedAt: html ? new Date().toISOString() : null,
    },
  });

  await prisma.school.update({
    where: { id: schoolId },
    data: { settings: stringifySchoolSettings(merged) },
  });

  invalidateSchoolCaches(schoolId);
  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard/documentos");
}

export async function saveContractTemplateAction(
  _prev: { success?: boolean; error?: string } | null,
  formData: FormData
) {
  const user = await requireSession([...DOC_ROLES]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const html = String(formData.get("contractTemplateHtml") ?? "").trim();
  const sourceName = String(formData.get("sourceName") ?? "").trim() || "modelo-institucional.html";

  if (!html) return { error: "O modelo não pode estar vazio." };

  await persistContractTemplate(user.schoolId, prepareImportedContractHtml(html), sourceName);
  return { success: true };
}

export async function clearContractTemplateAction(): Promise<void> {
  const user = await requireSession([...DOC_ROLES]);
  if (!user.schoolId) return;

  await persistContractTemplate(user.schoolId, null, null);
}

export async function importContractTemplateDocxAction(formData: FormData) {
  const user = await requireSession([...DOC_ROLES]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Arquivo não enviado." };
  if (!file.name.toLowerCase().endsWith(".docx")) return { error: "Envie um arquivo .docx." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const imported = await importDocxToHtml(buffer);
  const html = prepareImportedContractHtml(imported.html);

  await persistContractTemplate(user.schoolId, html, file.name);
  return { success: true, sourceName: file.name };
}
