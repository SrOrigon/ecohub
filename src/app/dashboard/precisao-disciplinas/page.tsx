import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { getSubjectPrecisionOverview } from "@/lib/subject-precision";
import { PageHeader } from "@/components/layout/page-header";
import { SubjectPrecisionPanel } from "@/components/institutional/subject-precision-panel";
import { Button } from "@/components/ui/button";

export default async function PrecisaoDisciplinasPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "director", "secretary", "teacher"].includes(user.role)) redirect("/dashboard");

  const [data, settings] = await Promise.all([
    getSubjectPrecisionOverview(user.schoolId),
    getSchoolSettings(user.schoolId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Precisão por disciplina"
        description="Indicadores de confiabilidade e efetividade do ensino  -  por matéria e por recurso (notas, diário, horários, exercícios)"
      >
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/leitura-geral">
            <Button variant="outline" className="gap-2">
              Leitura geral
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link href="/dashboard/disciplinas">
            <Button variant="outline" className="gap-2">
              <Target className="h-4 w-4" aria-hidden="true" />
              Gerenciar disciplinas
            </Button>
          </Link>
        </div>
      </PageHeader>

      <SubjectPrecisionPanel data={data} passGrade={settings.academic.passGrade} />
    </div>
  );
}
