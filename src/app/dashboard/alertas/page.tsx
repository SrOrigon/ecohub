import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getAttentionAlertsSnapshot } from "@/lib/attention-alerts";
import { AttentionAlertsPanel } from "@/components/alerts/attention-alerts-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { ExportGradesButton } from "@/components/dashboard/export-grades-button";

export default async function AlertasPage() {
  const user = await getSessionUser();
  if (!user?.schoolId) redirect("/login");
  if (!["admin", "director", "secretary"].includes(user.role)) redirect("/dashboard");

  const snapshot = await getAttentionAlertsSnapshot(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas de atenção"
        description="Monitoramento institucional: notas por matéria, frequência, faltas e prazos de entrega."
      >
        <ExportGradesButton />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-red-700">{snapshot.summary.critical}</p>
            <p className="text-xs text-slate-500">Críticos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-orange-700">{snapshot.summary.high}</p>
            <p className="text-xs text-slate-500">Altos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{snapshot.summary.medium}</p>
            <p className="text-xs text-slate-500">Médios</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-slate-700">{snapshot.summary.total}</p>
            <p className="text-xs text-slate-500">Total monitorado</p>
          </CardContent>
        </Card>
      </div>

      {snapshot.alerts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-500">
            Nenhum alerta no momento. O monitoramento continua ativo.
          </CardContent>
        </Card>
      ) : (
        <AttentionAlertsPanel
          initialAlerts={snapshot.alerts}
          maxItems={100}
          title="Todos os alertas da escola"
          description="Atualização automática via monitoramento contínuo."
        />
      )}

      {snapshot.summary.total > 0 && (
        <p className="text-center text-sm text-slate-500">
          <Link href="/dashboard/leitura-geral" className="text-indigo-600 hover:underline">
            Ver leitura geral institucional
          </Link>
        </p>
      )}
    </div>
  );
}
