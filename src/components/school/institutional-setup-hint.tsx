import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProvisionSchoolButton } from "@/components/school/provision-school-button";

export function InstitutionalSetupHint({
  canManageSettings,
  classCount,
  subjectCount,
}: {
  canManageSettings: boolean;
  classCount: number;
  subjectCount: number;
}) {
  return (
    <Card className="border-indigo-100 bg-indigo-50/60">
      <CardContent className="flex flex-wrap items-start gap-3 py-3 sm:py-4">
        <Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-300">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Cadastro manual da instituição</p>
            {canManageSettings && <ProvisionSchoolButton />}
          </div>
          <p className="mt-1 line-clamp-2 md:line-clamp-none">
            O Ecohub auxilia depois que você cadastra turmas, cursos e disciplinas. Cadastre primeiro;
            em seguida vincule cada aluno à turma ou curso correspondente.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/dashboard/turmas" className="font-medium text-indigo-700 hover:underline">
              {classCount === 0 ? "Cadastrar turmas / cursos" : `Turmas / cursos (${classCount})`}
            </Link>
            {canManageSettings && (
              <Link href="/dashboard/disciplinas" className="font-medium text-indigo-700 hover:underline">
                {subjectCount === 0 ? "Cadastrar disciplinas" : `Disciplinas (${subjectCount})`}
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
