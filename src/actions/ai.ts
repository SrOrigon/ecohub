"use server";

import { requireSession } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { generateQuestionsWithAi } from "@/lib/ai-questions";
import { eduhubAiChat } from "@/lib/eduhub-ai";
import { prisma } from "@/lib/db";
import { computeRiskAlerts } from "@/lib/risk-alerts";
import { getDashboardStats } from "@/lib/queries";
import type { EduHubAiRole } from "@/lib/eduhub-ai";

async function buildAiContext(user: Awaited<ReturnType<typeof requireSession>>) {
  const settings = user.schoolId ? await getSchoolSettings(user.schoolId) : null;
  const school = user.schoolId
    ? await prisma.school.findUnique({ where: { id: user.schoolId }, select: { name: true } })
    : null;

  let stats;
  let parentContext;

  if (user.schoolId && ["director", "secretary", "admin"].includes(user.role)) {
    const dash = await getDashboardStats(user.schoolId);
    const alerts = await computeRiskAlerts(user.schoolId);
    stats = {
      avgGrade: dash.averageGrade,
      attendanceRate: dash.attendanceRate,
      atRiskStudents: alerts.length,
    };
  }

  if (user.schoolId && user.role === "teacher") {
    const pendingSubmissions = await prisma.exerciseSubmission.count({
      where: {
        status: "submitted",
        exercise: { schoolId: user.schoolId, teacherId: user.id },
      },
    });
    stats = { ...stats, pendingSubmissions };
  }

  if (user.role === "parent") {
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: user.id },
      include: {
        student: {
          include: {
            user: { select: { fullName: true } },
            grades: { select: { value: true } },
            attendance: { orderBy: { date: "desc" }, take: 30 },
            exerciseSubmissions: {
              where: { status: { in: ["pending", "submitted"] } },
              select: { id: true },
            },
          },
        },
      },
    });
    if (link && settings) {
      const s = link.student;
      const avg =
        s.grades.length > 0 ? s.grades.reduce((a, g) => a + g.value, 0) / s.grades.length : settings.academic.passGrade;
      const absences = s.attendance.filter((a) => a.status === "absent").length;
      const total = s.attendance.length;
      const freq = total > 0 ? ((total - absences) / total) * 100 : 100;
      parentContext = {
        childName: s.user.fullName,
        avgGrade: avg,
        passGrade: settings.academic.passGrade,
        freqRate: freq,
        pendingExercises: s.exerciseSubmissions.length,
      };
    }
  }

  return {
    role: user.role as EduHubAiRole,
    userName: user.fullName,
    schoolName: school?.name,
    stats,
    parentContext,
  };
}

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

  const context = await buildAiContext(user);
  const reply = eduhubAiChat(message, context);

  await prisma.aiChatLog.createMany({
    data: [
      { userId: user.id, role: "user", content: message },
      { userId: user.id, role: "assistant", content: reply },
    ],
  });

  return { success: true, reply };
}
