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
import { redirect } from "next/navigation";

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
        description="Dados da instituição e regras que movem todo o EduHub"
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="default">{settings.academic.subjects.length} disciplinas</Badge>
        <Badge variant="default">{settings.academic.periods.length} períodos</Badge>
        <Badge variant="success">{settings.xp.xpPerLevel} XP/nível</Badge>
        <Badge variant="warning">
          Auto-correção {settings.exercises.autoGradeEnabled ? "ligada" : "desligada"}
        </Badge>
        <Badge variant="default">{settings.branding.tagline ? "Tema personalizado" : "Tema padrão"}</Badge>
      </div>

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
            Compartilhe com professores e famílias após a verificação. Demo: <strong>escola-demo</strong>
          </p>
        </CardContent>
      </Card>

      <SchoolSettingsForm school={school} />
      <SchoolRulesForm initial={settings} />

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
          <p className="pt-2 text-xs text-slate-400">EduHub 0.3.0 · regras por escola em JSON</p>
        </CardContent>
      </Card>
    </div>
  );
}
