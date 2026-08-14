import { getSchool } from "@/lib/queries";
import { getInstitutionalReport } from "@/lib/institutional-report";
import { PrintableReport } from "@/components/reports/printable-report";
import { requirePageAccess, STAFF_ROLES } from "@/lib/access-control";

export default async function RelatoriosImprimirPage() {
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
        Não foi possível gerar o relatório para impressão.
      </div>
    );
  }

  return <PrintableReport report={report} />;
}
