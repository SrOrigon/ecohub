import { getSchool } from "@/lib/queries";
import { getInstitutionalReport } from "@/lib/institutional-report";
import { PageHeader } from "@/components/layout/page-header";
import { InstitutionalReportDashboard } from "@/components/reports/institutional-report-dashboard";
import { OperationalReportPanel } from "@/components/reports/operational-report-panel";
import { loadOperationalReport, loadReportOptions, type ReportFilters } from "@/lib/operational-reports";
import { requirePageAccess, STAFF_ROLES } from "@/lib/access-control";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<ReportFilters>;
}) {
  const filters = await searchParams;
  const user = await requirePageAccess(STAFF_ROLES);

  const school = await getSchool(user);
  const teacherId = user.role === "teacher" ? user.id : undefined;
  const options = user.schoolId ? await loadReportOptions(user.schoolId, teacherId) : { classes: [], students: [] };
  const table =
    user.schoolId && filters.tipo
      ? await loadOperationalReport(user.schoolId, school?.name ?? "Escola", filters, teacherId)
      : null;

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
        title="Relatórios"
        description="Alunos, didático, documentos, estoque da loja, financeiro e gerencial. O relatório pedagógico continua abaixo."
      />

      <OperationalReportPanel
        filters={filters}
        classes={options.classes}
        students={options.students}
        table={table}
      />

      <InstitutionalReportDashboard report={report} />
    </div>
  );
}
