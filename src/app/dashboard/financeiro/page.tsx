import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { BillingChargesBoard } from "@/components/finance/billing-charges-board";
import { InstitutionTuitionPlans } from "@/components/finance/institution-tuition-plans";
import { listBillingCharges } from "@/lib/billing-charges";
import { listInstitutionTuitionPlans, type InstitutionTuitionClass, type InstitutionTuitionPlan } from "@/lib/institution-tuition";
import type { BillingCharge } from "@/lib/billing-status";

export default async function FinanceiroGestaoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "director" && user.role !== "secretary") {
    redirect("/dashboard");
  }

  const emptyTuition: { classes: InstitutionTuitionClass[]; plans: InstitutionTuitionPlan[] } = {
    classes: [],
    plans: [],
  };
  const [charges, tuition]: [BillingCharge[], { classes: InstitutionTuitionClass[]; plans: InstitutionTuitionPlan[] }] =
    user.schoolId
      ? await Promise.all([
          listBillingCharges(user.schoolId).catch((error) => {
            console.error("[financeiro] cobranças", error);
            return [] as BillingCharge[];
          }),
          listInstitutionTuitionPlans(user.schoolId).catch((error) => {
            console.error("[financeiro] planos", error);
            return emptyTuition;
          }),
        ])
      : [[], emptyTuition];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Cobranças e pendências"
        description="A instituição define o valor, o vencimento e as parcelas. Com isso o sistema mostra quem tem pendência e envia a cobrança no WhatsApp do responsável."
      />

      <InstitutionTuitionPlans classes={tuition.classes} plans={tuition.plans} />

      <BillingChargesBoard charges={charges} canCharge initialFilter="pending" />
    </div>
  );
}
