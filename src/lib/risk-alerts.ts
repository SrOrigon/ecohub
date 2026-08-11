import { computeAttentionAlerts, type AttentionAlertSeverity } from "@/lib/attention-alerts";

export type RiskAlert = {
  id: string;
  severity: "high" | "medium";
  title: string;
  message: string;
  href: string;
  studentId?: string;
};

function mapSeverity(severity: AttentionAlertSeverity): "high" | "medium" {
  return severity === "critical" || severity === "high" ? "high" : "medium";
}

export async function computeRiskAlerts(schoolId: string): Promise<RiskAlert[]> {
  const alerts = await computeAttentionAlerts(schoolId, { audience: "staff" });
  return alerts.map((alert) => ({
    id: alert.id,
    severity: mapSeverity(alert.severity),
    title: alert.title,
    message: alert.message,
    href: alert.href,
    studentId: alert.studentId,
  }));
}
