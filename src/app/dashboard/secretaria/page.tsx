import Link from "next/link";
import { ClipboardList, FileCheck, MessageSquare, AlertTriangle, Bot, CreditCard, ArrowRight } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeRiskAlerts } from "@/lib/risk-alerts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatMetricCard } from "@/components/ui/stat-metric-card";
import { AdjustStudentPointsForm } from "@/components/forms/adjust-student-points-form";
import { getStudents } from "@/lib/queries";
import { redirect } from "next/navigation";
import { getOverdueFinanceAlertsAction } from "@/actions/student-finance";
import { getAwaitingConfirmationInvoicesAction } from "@/actions/invoices";
import { AdminInvoicesManager } from "@/components/finance/admin-invoices-manager";
import { formatBRL } from "@/lib/student-finance";

export default async function SecretariaPage() {
  const user = await getSessionUser();
  if (!user?.schoolId) redirect("/login");
  if (user.role !== "secretary" && user.role !== "admin") redirect("/dashboard");

  const [pendingEnrollments, pendingAuths, unreadThreads, alerts, students, overdueAlerts, awaitingInvoices] = await Promise.all([
    prisma.enrollmentApplication.count({ where: { schoolId: user.schoolId, status: "pending" } }),
    prisma.authorizationForm.count({
      where: { schoolId: user.schoolId, responses: { none: {} } },
    }),
    prisma.chatThread.count({ where: { schoolId: user.schoolId } }),
    computeRiskAlerts(user.schoolId),
    getStudents(user.schoolId),
    getOverdueFinanceAlertsAction(5),
    getAwaitingConfirmationInvoicesAction(),
  ]);

  const adjustStudents = students.map((s) => ({
    id: s.id,
    name: s.user.fullName,
    className: s.classGroup?.name ?? null,
  }));

  const cards = [
    { label: "Matrículas pendentes", value: pendingEnrollments, href: "/dashboard/matriculas", icon: FileCheck },
    { label: "Autorizações abertas", value: pendingAuths, href: "/dashboard/autorizacoes", icon: ClipboardList },
    { label: "Conversas família", value: unreadThreads, href: "/dashboard/mensagens", icon: MessageSquare },
    { label: "Alertas de risco", value: alerts.length, href: "/dashboard/alertas", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel da Secretaria"
        description="Operações do dia a dia  -  matrículas, documentos, mensagens e alertas."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/configuracoes/pagamentos"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            <CreditCard className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            Configurar Recebimentos Pix
          </Link>
          <Link
            href="/dashboard/leitura-geral"
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Leitura geral pedagógica
          </Link>
        </div>
      </PageHeader>

      {overdueAlerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-900 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Alerta de Inadimplência (&gt; 5 dias de atraso)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-950 space-y-2">
            <p className="text-xs text-amber-800">
              Foram identificadas {overdueAlerts.length} cobrança(s) em atraso superior a 5 dias:
            </p>
            <div className="divide-y divide-amber-200/60 rounded-lg border border-amber-200 bg-white/80 p-2">
              {overdueAlerts.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1.5 text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{item.studentName}</span>{" "}
                    <span className="text-slate-500">({item.studentClass})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-amber-800">{formatBRL(item.amountCents)}</span>{" "}
                    <span className="text-amber-600">({item.daysOverdue} dias de atraso)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {awaitingInvoices.length > 0 && (
        <AdminInvoicesManager pendingInvoices={awaitingInvoices} />
      )}

      <div className="stat-grid">
        {cards.map(({ label, value, href, icon: Icon }) => (
          <StatMetricCard
            key={href}
            href={href}
            label={label}
            value={value}
            icon={Icon}
          />
        ))}
      </div>

      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-emerald-950 dark:text-emerald-100">
            <CreditCard className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            Gestão Financeira &amp; Recebimentos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-emerald-950 dark:text-emerald-200">
          <p className="text-slate-700 dark:text-slate-300">
            Defina a chave Pix institucional, instruções de transferência e integrações com gateway de pagamentos.
          </p>
          <Link
            href="/dashboard/configuracoes/pagamentos"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 shrink-0"
          >
            <span>Configurar Recebimentos Pix</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

      {adjustStudents.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/40">
          <CardHeader>
            <CardTitle>Pontos em atividade de sala</CardTitle>
          </CardHeader>
          <CardContent>
            <AdjustStudentPointsForm students={adjustStudents} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Ecohub IA para secretaria
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <p>
            Use a assistente para rascunhar comunicados, orientar famílias sobre matrícula e tirar dúvidas
            operacionais  -  tudo local, sem API paga.
          </p>
          <Link href="/dashboard/assistente" className="mt-3 inline-block text-indigo-600 hover:underline">
            Abrir Ecohub IA →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
