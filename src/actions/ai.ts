"use server";

import { requireSession } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { generateQuestionsWithAi } from "@/lib/ai-questions";
import { eduhubAiChat } from "@/lib/eduhub-ai";
import { prisma } from "@/lib/db";
import { computeRiskAlerts } from "@/lib/risk-alerts";
import { getDashboardStats } from "@/lib/queries";
import type { EduHubAiRole } from "@/lib/eduhub-ai";

export async function generateExerciseQuestionsAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "secretary", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (!settings.ai.enabled) return { error: "EduHub IA desativada nas configurações." };

  const topic = formData.get("topic")?.toString().trim();
  const subject = formData.get("subject")?.toString().trim() ?? "Geral";
  const count = Number(formData.get("count") ?? 3);
  const bncc = formData.get("bncc")?.toString().trim();

  if (!topic) return { error: "Informe o tema das questões." };

  const questions = await generateQuestionsWithAi(topic, subject, count, bncc);
  return { success: true, questions, source: "eduhub-ia-local" };
}

export async function eduhubAiChatAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "secretary", "teacher", "student", "parent"]);
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Digite uma mensagem." };

  const settings = user.schoolId ? await getSchoolSettings(user.schoolId) : null;
  if (settings && !settings.ai.enabled) return { error: "EduHub IA desativada." };

  let stats;
  if (user.schoolId && ["director", "secretary", "admin"].includes(user.role)) {
    const dash = await getDashboardStats(user.schoolId);
    const alerts = await computeRiskAlerts(user.schoolId);
    stats = { avgGrade: dash.averageGrade, attendanceRate: dash.attendanceRate, atRiskStudents: alerts.length };
  }

  const reply = eduhubAiChat(message, {
    role: user.role as EduHubAiRole,
    userName: user.fullName,
    stats,
  });

  await prisma.aiChatLog.createMany({
    data: [
      { userId: user.id, role: "user", content: message },
      { userId: user.id, role: "assistant", content: reply },
    ],
  });

  return { success: true, reply };
}
