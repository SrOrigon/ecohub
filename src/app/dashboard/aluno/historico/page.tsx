import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStudentHistory } from "@/lib/institutional-history";
import { PageHeader } from "@/components/layout/page-header";
import { HistoricalAnalyticsPanel } from "@/components/institutional/historical-analytics-panel";
import { Button } from "@/components/ui/button";

export default async function AlunoHistoricoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/dashboard/historico");

  const student = await prisma.student.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!student) redirect("/dashboard/aluno");

  const history = await getStudentHistory(student.id);
  if (!history) redirect("/dashboard/aluno");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu histórico"
        description="Sua evolução desde a matrícula — compare desempenho dia a dia, semana a semana e mês a mês"
      >
        <Link href="/dashboard/aluno">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar ao perfil
          </Button>
        </Link>
      </PageHeader>

      <HistoricalAnalyticsPanel
        history={history}
        title="Histórico pessoal"
        description="Métricas calculadas desde a data da sua matrícula no EduHub"
      />
    </div>
  );
}
