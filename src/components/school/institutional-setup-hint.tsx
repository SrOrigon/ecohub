import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
      <CardContent className="flex flex-wrap items-start gap-3 py-4">
        <Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Cadastro manual da instituição</p>
          <p className="mt-1">
            O EduHub auxilia depois que você cadastra turmas, cursos e disciplinas. Cadastre primeiro;
            em seguida vincule cada aluno à turma ou curso correspondente.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/dashboard/turmas" className="font-medium text-indigo-700 hover:underline">
              {classCount === 0 ? "Cadastrar turmas / cursos" : `Turmas / cursos (${classCount})`}
            </Link>
            {canManageSettings && (
              <Link href="/dashboard/configuracoes" className="font-medium text-indigo-700 hover:underline">
                {subjectCount === 0 ? "Cadastrar disciplinas" : `Disciplinas (${subjectCount})`}
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
