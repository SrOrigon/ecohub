import { getSessionUser } from "@/lib/auth";
import { getSchool } from "@/lib/queries";
import { parseSchoolSettings } from "@/lib/school-settings";
import { SchoolSettingsForm } from "@/components/forms/school-settings-form";
import { SchoolRulesForm } from "@/components/forms/school-rules-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCnpj } from "@/lib/cnpj";
import {
  SCHOOL_VERIFICATION_LABELS,
  verificationStatusMessage,
  type SchoolVerificationStatus,
} from "@/lib/school-verification";
import { TenantUrlCard } from "@/components/school/tenant-url-card";
import { PERIODS } from "@/lib/constants";
import { closePeriodAction } from "@/actions/product-suite";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-fields";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, ArrowRight } from "lucide-react";

export default async function ConfiguracoesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "director") redirect("/dashboard");

  const school = await getSchool(user);

  if (!school) {
    return <p>Escola não configurada.</p>;
  }

  const settings = parseSchoolSettings(school.settings);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Dados da instituição e regras que movem todo o Ecohub"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default">{settings.academic.subjects.length} disciplinas</Badge>
        <Link href="/dashboard/disciplinas" className="text-sm font-medium text-[color:var(--school-primary)] hover:underline">
          Gerenciar disciplinas
        </Link>
        <Badge variant="default">{settings.academic.periods.length} períodos</Badge>
        <Badge variant="success">{settings.xp.xpPerLevel} XP/nível</Badge>
        <Badge variant="warning">
          Auto-correção {settings.exercises.autoGradeEnabled ? "ligada" : "desligada"}
        </Badge>
        <Badge variant="default">{settings.branding.tagline ? "Tema personalizado" : "Tema padrão"}</Badge>
        <Link href="/dashboard/configuracoes/pagamentos" className="text-sm font-medium text-emerald-700 hover:underline">
          Configurar métodos de recebimento (Pix / Gateway)
        </Link>
      </div>

      {(user.role === "admin" || user.role === "director") && (
        <Card className="border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white dark:border-emerald-800 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <CreditCard className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-emerald-950 dark:text-emerald-100">
                  Pagamentos &amp; Cobranças (Pix / Gateway)
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              Configure a chave Pix da instituição ou conecte seu gateway de faturamento para recebimento de mensalidades e taxas.
            </p>
            <div>
              <Link
                href="/dashboard/configuracoes/pagamentos"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-base font-semibold text-white shadow-xs hover:bg-emerald-700 transition-all duration-150 active:scale-[0.98]"
              >
                <span>Configurar Pagamentos &amp; Recebimentos</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-indigo-200 bg-indigo-50/80 dark:border-indigo-900 dark:bg-indigo-950/30">
        <CardHeader>
          <CardTitle className="text-base">Instituição verificada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                school.verificationStatus === "verified"
                  ? "success"
                  : school.verificationStatus === "manual_review"
                    ? "warning"
                    : "secondary"
              }
            >
              {SCHOOL_VERIFICATION_LABELS[school.verificationStatus as SchoolVerificationStatus] ??
                school.verificationStatus}
            </Badge>
            {school.cnpj && (
              <span className="font-mono text-[var(--foreground)]">{formatCnpj(school.cnpj)}</span>
            )}
          </div>
          {school.legalName && (
            <p className="text-[var(--foreground)]">{school.legalName}</p>
          )}
          <p className="text-[var(--muted-foreground)]">
            {verificationStatusMessage(school.verificationStatus as SchoolVerificationStatus)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-indigo-200 bg-indigo-50/80 dark:border-indigo-900 dark:bg-indigo-950/30">
        <CardHeader>
          <CardTitle className="text-base">Código da escola</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-lg font-bold text-indigo-900 dark:text-indigo-200">{school.slug}</p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Compartilhe com professores e famílias após a instituição estar verificada na Receita Federal.
          </p>
        </CardContent>
      </Card>

      <Card className="border-indigo-200 bg-indigo-50/80 dark:border-indigo-900 dark:bg-indigo-950/30">
        <CardHeader>
          <CardTitle className="text-base">Links do portal da escola</CardTitle>
        </CardHeader>
        <CardContent>
          <TenantUrlCard slug={school.slug} schoolName={school.name} />
        </CardContent>
      </Card>

      <SchoolSettingsForm school={school} />
      <SchoolRulesForm initial={settings} />

      <Card>
        <CardHeader>
          <CardTitle>Fechamento de bimestre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Períodos fechados bloqueiam edição e exclusão de notas. Atualmente fechados:{" "}
            {settings.gradeRules.closedPeriods.length > 0
              ? settings.gradeRules.closedPeriods.join(", ")
              : "nenhum"}
          </p>
          <form action={closePeriodAction} className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="period" className="mb-1 block text-sm font-medium">
                Fechar período
              </label>
              <Select id="period" name="period" required defaultValue={PERIODS[0]}>
                {PERIODS.map((p) => (
                  <option key={p} value={p} disabled={settings.gradeRules.closedPeriods.includes(p)}>
                    {p}
                    {settings.gradeRules.closedPeriods.includes(p) ? " (fechado)" : ""}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline">
              Fechar bimestre
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como as engrenagens se conectam</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            <strong>Notas</strong> → XP (e bônus) conforme regras · avisam pais se ligado.
          </p>
          <p>
            <strong>Frequência</strong> → XP de presença/atraso · faltas avisam família.
          </p>
          <p>
            <strong>Exercícios</strong> → auto-correção opcional · XP/moedas · boletim opcional.
          </p>
          <p>
            <strong>Missões</strong> → defaults de XP/moedas · aluno pede confirmação · professor conclui.
          </p>
          <p>
            <strong>Loja</strong> → resgate pendente → entrega (professor se permitido).
          </p>
          <p className="pt-2 text-xs text-slate-400">Ecohub 0.3.0 · regras por escola em JSON</p>
        </CardContent>
      </Card>
    </div>
  );
}
