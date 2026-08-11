import Link from "next/link";
import { History, ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getInstitutionalHistory } from "@/lib/institutional-history";
import { PageHeader } from "@/components/layout/page-header";
import { HistoricalAnalyticsPanel } from "@/components/institutional/historical-analytics-panel";
import { Button } from "@/components/ui/button";

export default async function HistoricoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "director", "secretary", "teacher"].includes(user.role)) redirect("/dashboard");

  const history = await getInstitutionalHistory(user.schoolId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico temporal"
        description="Linha do tempo completa da instituição — compare métricas do dia ao ano, desde a criação da conta no EduHub"
      >
        <Link href="/dashboard/leitura-geral">
          <Button variant="outline" className="gap-2">
            Leitura geral
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </PageHeader>

      <HistoricalAnalyticsPanel history={history} />
    </div>
  );
}
