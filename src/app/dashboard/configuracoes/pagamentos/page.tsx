import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import {
  getSchoolPaymentConfigAction,
  getCardMachinesAction,
} from "@/actions/school-payment-config";
import { SchoolPaymentSettingsForm } from "@/components/finance/school-payment-settings-form";

export default async function PagamentosConfigPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "director") redirect("/dashboard");

  const [config, cardMachines] = await Promise.all([
    getSchoolPaymentConfigAction(),
    getCardMachinesAction(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Métodos de Pagamento e Recebimento"
        description="Configure sua Chave Pix ou integre seu próprio gateway (Asaas, Mercado Pago, Efí) sem taxa de intermediação."
      />

      <SchoolPaymentSettingsForm initial={config} initialCardMachines={cardMachines} />
    </div>
  );
}
