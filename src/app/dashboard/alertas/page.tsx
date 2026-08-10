import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { computeRiskAlerts } from "@/lib/risk-alerts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";
import { ExportGradesButton } from "@/components/dashboard/export-grades-button";

export default async function AlertasPage() {
  const user = await getSessionUser();
  if (!user?.schoolId) redirect("/login");
  if (!["admin", "director", "secretary"].includes(user.role)) redirect("/dashboard");

  const alerts = await computeRiskAlerts(user.schoolId);

  return (
    <div className="space-y-6">
      <PageHeader title="Alertas de risco" description="Alunos com notas baixas, faltas críticas ou evasão recente.">
        <ExportGradesButton />
      </PageHeader>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-500">
            Nenhum alerta no momento. Continue monitorando frequência e notas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Link key={alert.id} href={alert.href}>
              <Card className="transition hover:shadow-md">
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{alert.title}</p>
                      <Badge variant={alert.severity === "high" ? "danger" : "warning"}>
                        {alert.severity === "high" ? "Alto" : "Médio"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{alert.message}</p>
                  </div>
                  <span className="text-sm text-indigo-600">Ver →</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
