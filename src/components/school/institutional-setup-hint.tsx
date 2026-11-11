import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function InstitutionalSetupHint({
  canManageSettings,
  classCount,
  subjectCount,
  periodCount,
  studentCount,
  financePlanCount,
}: {
  canManageSettings: boolean;
  classCount: number;
  subjectCount: number;
  periodCount: number;
  studentCount: number;
  financePlanCount: number;
}) {
  const steps = [
    { done: classCount > 0, label: classCount === 0 ? "Cadastrar turmas" : `Turmas (${classCount})`, href: "/dashboard/turmas" },
    {
      done: subjectCount > 0,
      label: subjectCount === 0 ? "Cadastrar disciplinas" : `Disciplinas (${subjectCount})`,
      href: "/dashboard/disciplinas",
      settingsOnly: true,
    },
    {
      done: periodCount > 0,
      label: periodCount === 0 ? "Definir os períodos letivos" : `Períodos (${periodCount})`,
      href: "/dashboard/configuracoes",
      settingsOnly: true,
    },
    { done: studentCount > 0, label: studentCount === 0 ? "Cadastrar alunos" : `Alunos (${studentCount})`, href: "/dashboard/alunos" },
    {
      done: financePlanCount > 0,
      label: financePlanCount === 0 ? "Definir a mensalidade" : `Planos financeiros (${financePlanCount})`,
      href: "/dashboard/financeiro",
      settingsOnly: true,
    },
  ].filter((step) => !step.settingsOnly || canManageSettings);

  const pending = steps.filter((step) => !step.done);
  if (pending.length === 0) return null;

  return (
    <Card className="border-indigo-100 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30">
      <CardContent className="flex flex-wrap items-start gap-3 py-3 sm:py-4">
        <Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Primeiros cadastros da instituição</p>
          <p className="mt-1">O Ecohub usa somente o que a escola cadastrar. Falta concluir:</p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {pending.map((step) => (
              <li key={step.href + step.label}>
                <Link href={step.href} className="font-medium text-indigo-700 hover:underline">
                  {step.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
