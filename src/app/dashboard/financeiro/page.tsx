import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PaymentManagementPanel } from "@/components/finance/payment-management-panel";

export default async function FinanceiroGestaoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "director" && user.role !== "secretary") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Gestão de Pagamentos"
        description="Filtros avançados e operações em lote para geração, liquidação e consulta de pagamentos via Sponte Pay."
      />

      <PaymentManagementPanel />
    </div>
  );
}
