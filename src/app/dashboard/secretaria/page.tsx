import Link from "next/link";
import { ClipboardList, FileCheck, MessageSquare, AlertTriangle, Bot } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeRiskAlerts } from "@/lib/risk-alerts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function SecretariaPage() {
  const user = await getSessionUser();
  if (!user?.schoolId) redirect("/login");
  if (user.role !== "secretary" && user.role !== "admin") redirect("/dashboard");

  const [pendingEnrollments, pendingAuths, unreadThreads, alerts] = await Promise.all([
    prisma.enrollmentApplication.count({ where: { schoolId: user.schoolId, status: "pending" } }),
    prisma.authorizationForm.count({
      where: { schoolId: user.schoolId, responses: { none: {} } },
    }),
    prisma.chatThread.count({ where: { schoolId: user.schoolId } }),
    computeRiskAlerts(user.schoolId),
  ]);

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
        description="Operações do dia a dia — matrículas, documentos, mensagens e alertas."
      >
        <Link
          href="/dashboard/leitura-geral"
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
        >
          Leitura geral pedagógica
        </Link>
      </PageHeader>

      <div className="responsive-grid">
        {cards.map(({ label, value, href, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="transition hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
                <Icon className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

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
            operacionais — tudo local, sem API paga.
          </p>
          <Link href="/dashboard/assistente" className="mt-3 inline-block text-indigo-600 hover:underline">
            Abrir Ecohub IA →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
