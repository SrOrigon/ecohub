import { getSessionUser } from "@/lib/auth";
import { getAttentionAlertsSnapshot } from "@/lib/attention-alerts";
import { AttentionAlertsPanel } from "@/components/alerts/attention-alerts-panel";
import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "next/navigation";

export default async function ResponsavelAlertasPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login/responsavel");
  if (user.role !== "parent") redirect("/dashboard");

  const snapshot = await getAttentionAlertsSnapshot(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas de atenção"
        description="Monitoramento contínuo sobre desempenho, frequência e prazos dos seus filhos."
        backHref="/dashboard/responsavel"
        backLabel="Voltar ao portal"
      />

      <AttentionAlertsPanel
        initialAlerts={snapshot.alerts}
        maxItems={50}
        title="Todos os alertas monitorados"
        description="Esta página atualiza automaticamente quando há mudanças em notas, faltas ou entregas."
      />
    </div>
  );
}
