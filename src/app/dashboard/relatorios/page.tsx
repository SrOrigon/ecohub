import { getSchool } from "@/lib/queries";
import { getInstitutionalReport } from "@/lib/institutional-report";
import { PageHeader } from "@/components/layout/page-header";
import { InstitutionalReportDashboard } from "@/components/reports/institutional-report-dashboard";
import { requirePageAccess, STAFF_ROLES } from "@/lib/access-control";

export default async function RelatoriosPage() {
  const user = await requirePageAccess(STAFF_ROLES);

  const school = await getSchool(user);
  const teacherId = user.role === "teacher" ? user.id : undefined;

  const report = await getInstitutionalReport(user.schoolId, {
    teacherId,
    schoolName: school?.name,
  });

  if (!report) {
    return (
      <div className="p-6 text-center text-slate-600">
        Escola não configurada  -  impossível gerar relatórios.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios institucionais"
        description="Exportação Excel (CSV), impressão/PDF e detalhamento por disciplina, aluno e matriz aluno × matéria"
      />

      <InstitutionalReportDashboard report={report} />
    </div>
  );
}
