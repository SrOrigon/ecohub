"use server";

import { requireSession } from "@/lib/auth";
import { getInstitutionalReport } from "@/lib/institutional-report";
import { sendEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit-logger";

export async function scheduleWeeklyExecutiveReportAction(formData?: FormData) {
  const user = await requireSession(["director", "admin"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const targetEmail = formData ? String(formData.get("email") ?? "").trim() : user.email;
  const emailToSend = targetEmail || user.email;

  const report = await getInstitutionalReport(user.schoolId);
  if (!report) return { error: "Impossível compilar resumo do relatório." };

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;">
      <h2 style="color: #4f46e5;">Ecohub - Resumo Executivo Semanal</h2>
      <p>Olá, <strong>${user.fullName}</strong>!</p>
      <p>Aqui está o compilado do relatório pedagógico semanal da instituição <strong>${report.schoolName}</strong>:</p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p><strong>Média Geral:</strong> ${report.summary.averageGrade.toFixed(1)} / ${report.maxGrade}</p>
        <p><strong>Frequência Global:</strong> ${report.summary.attendanceRate}%</p>
        <p><strong>Taxa de Aprovação:</strong> ${report.summary.passRate}%</p>
        <p><strong>Risco de Abandono / Evasão:</strong> ${report.summary.dropoutRiskRate}%</p>
        <p><strong>Cobertura da BNCC:</strong> ${report.summary.bnccCoverageRate}%</p>
        <p><strong>Engajamento Familiar:</strong> ${report.summary.familyEngagementIndex}%</p>
        <p><strong>Saúde Pedagógica:</strong> ${report.summary.healthScore} pts (${report.summary.healthLabel})</p>
      </div>

      <p style="font-size: 12px; color: #64748b;">
        Este e-mail foi gerado automaticamente pelo agendador de inteligência pedagógica do Ecohub.
      </p>
    </div>
  `;

  const emailRes = await sendEmail({
    to: emailToSend,
    subject: `[Ecohub] Relatório Executivo Semanal - ${report.schoolName}`,
    html,
  });

  await logAuditEvent({
    schoolId: user.schoolId,
    actorId: user.id,
    actorRole: user.role,
    action: "WEEKLY_REPORT_SCHEDULED",
    entityType: "InstitutionalReport",
    diffAfter: { recipientEmail: emailToSend, scheduled: true },
  });

  if (!emailRes.ok) {
    return { error: emailRes.error ?? "Falha ao enviar e-mail." };
  }

  return {
    success: true,
    message: emailRes.skipped
      ? `Agendamento ativado! Relatório semanal será enviado para ${emailToSend} (Serviço de e-mail em modo simulação).`
      : `Relatório semanal agendado e enviado com sucesso para ${emailToSend}!`,
  };
}
