import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordAttendanceForm } from "@/components/forms/record-attendance-form";
import { BulkAttendanceForm } from "@/components/forms/bulk-attendance-form";
import { ImportAttendanceForm } from "@/components/forms/import-attendance-form";
import { JustificationsPanel } from "@/components/attendance/justifications-panel";
import { AttendanceFilterBar } from "@/components/attendance/attendance-filter-bar";
import { StudentContactModal } from "@/components/attendance/student-contact-modal";
import { PageHeader } from "@/components/layout/page-header";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { formatDate } from "@/lib/utils";
import { getClasses, getMonthlyAttendance, getStudents } from "@/lib/queries";
import { fetchJustifiedAttendance } from "@/lib/reads/attendance-reads";
import { requirePageAccess, STAFF_ROLES } from "@/lib/access-control";

const statusLabels: Record<string, { label: string; variant: "success" | "danger" | "warning" | "secondary" }> = {
  present: { label: "Presente", variant: "success" },
  absent: { label: "Falta", variant: "danger" },
  late: { label: "Atraso", variant: "warning" },
  justified: { label: "Justificada", variant: "secondary" },
};

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

interface PageProps {
  searchParams?: Promise<{
    month?: string;
    year?: string;
    classId?: string;
    q?: string;
    status?: string;
    pagina?: string;
  }>;
}

export default async function FrequenciaPage(props: PageProps) {
  const user = await requirePageAccess(STAFF_ROLES);
  const params = (await props.searchParams) ?? {};

  const now = new Date();
  const activeMonth = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const activeYear = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const activePage = params.pagina ? Math.max(1, parseInt(params.pagina, 10)) : 1;
  const classIdFilter = params.classId || undefined;
  const statusFilter = params.status || "";
  const searchQuery = (params.q || "").trim();

  const activeMonthName = monthNames[activeMonth - 1] ?? "Mês Vigente";

  const teacherFilter = user.role === "teacher" ? user.id : undefined;

  const [students, classes] = await Promise.all([
    getStudents(user.schoolId),
    getClasses(user.schoolId, teacherFilter),
  ]);

  const teacherClassIds = teacherFilter ? classes.map((c) => c.id) : undefined;

  const [monthlyAttendanceData, justifications] = await Promise.all([
    getMonthlyAttendance(user.schoolId, {
      month: activeMonth,
      year: activeYear,
      classId: classIdFilter,
      teacherClassIds,
      status: statusFilter,
      search: searchQuery,
      page: activePage,
      pageSize: 50,
    }),
    user.schoolId
      ? fetchJustifiedAttendance(user, user.schoolId, teacherFilter)
      : Promise.resolve([]),
  ]);

  const {
    records: filteredAttendance,
    totalCount,
    totalMonthlyRecords,
    totalAbsences,
    attendanceRate,
    alertedStudents,
    studentAbsenceMap,
    page,
    totalPages,
  } = monthlyAttendanceData;

  const filteredStudents = teacherFilter
    ? students.filter((s) => s.classId && classes.some((c) => c.id === s.classId))
    : students;

  const studentOptions = filteredStudents.map((s) => ({
    id: s.id,
    name: s.user.fullName,
    classId: s.classId,
  }));

  const classesForBulk = classes.map((c) => ({
    id: c.id,
    name: c.name,
    students: c.students.map((s) => ({ id: s.id, name: s.user.fullName })),
  }));

  const filterClasses = classes.map((c) => ({ id: c.id, name: c.name }));

  // URL builder helper for pagination links
  function buildPageUrl(p: number) {
    const paramsObj = new URLSearchParams();
    if (params.month) paramsObj.set("month", params.month);
    if (params.year) paramsObj.set("year", params.year);
    if (params.classId) paramsObj.set("classId", params.classId);
    if (params.q) paramsObj.set("q", params.q);
    if (params.status) paramsObj.set("status", params.status);
    paramsObj.set("pagina", String(p));
    return `/dashboard/frequencia?${paramsObj.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Frequência"
        description={`Registro e consulta histórica de presença · ${activeMonthName}/${activeYear}`}
      >
        <ImportAttendanceForm classes={classesForBulk} />
        <BulkAttendanceForm classes={classesForBulk} />
        <RecordAttendanceForm students={studentOptions} />
      </PageHeader>

      {/* Metric Cards Top Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Taxa de Frequência ({activeMonthName})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{attendanceRate}%</div>
            <p className="mt-1 text-xs text-slate-500">
              Média consolidada de presença no mês ({totalMonthlyRecords} chamadas)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total de Faltas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{totalAbsences}</div>
            <p className="mt-1 text-xs text-slate-500">
              Ausências acumuladas em {activeMonthName}/{activeYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Alunos em Alerta (&gt; 3 faltas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{alertedStudents.length}</div>
            <p className="mt-1 text-xs text-slate-500">
              Atingiram limite de alerta no período
            </p>
          </CardContent>
        </Card>
      </div>

      {alertedStudents.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-900">
              ⚠️ Alunos em Alerta por Excesso de Faltas ({alertedStudents.length}) — Ação de Busca Ativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2.5">
              {alertedStudents.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-amber-300 bg-white p-2 text-xs text-amber-900 shadow-2xs"
                >
                  <div>
                    <span className="font-semibold">{s.name}</span>
                    <span className="ml-1 text-slate-500">({s.className})</span>
                    <Badge variant="danger" className="ml-1.5 px-1.5 py-0 text-[10px]">
                      {s.absences} faltas no mês
                    </Badge>
                  </div>
                  <StudentContactModal
                    studentName={s.name}
                    studentPhone={s.phone}
                    parents={s.parents}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AttendanceFilterBar
        currentMonth={activeMonth}
        currentYear={activeYear}
        currentClassId={classIdFilter ?? ""}
        currentSearch={searchQuery}
        currentStatus={statusFilter}
        classes={filterClasses}
      />

      <JustificationsPanel records={justifications} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Registros de Frequência — {activeMonthName} de {activeYear} ({totalCount} encontrados)
          </CardTitle>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Página {page} de {totalPages}</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="min-w-0">
          <ResponsiveTable minWidth="42rem">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="hidden pb-3 pr-4 sm:table-cell">Data</th>
                <th className="pb-3 pr-4">Aluno</th>
                <th className="hidden pb-3 pr-4 md:table-cell">Turma</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="hidden pb-3 pr-4 sm:table-cell">Faltas no Mês</th>
                <th className="pb-3">Contato Rápido</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.map((record) => {
                const status = statusLabels[record.status] ?? statusLabels.present;
                const monthlyAbsences = studentAbsenceMap.get(record.studentId) ?? 0;
                const isAlerted = monthlyAbsences > 3;

                return (
                  <tr key={record.id} className="border-b border-slate-100">
                    <td className="hidden py-3 pr-4 sm:table-cell">{formatDate(record.date)}</td>
                    <td className="max-w-[8rem] py-3 pr-4 sm:max-w-none font-medium">
                      {record.student.user.fullName}
                    </td>
                    <td className="hidden py-3 pr-4 md:table-cell">{record.classGroup.name}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {record.justificationNote && (
                        <p className="mt-1 max-w-xs text-xs text-slate-500">{record.justificationNote}</p>
                      )}
                    </td>
                    <td className="hidden py-3 pr-4 sm:table-cell">
                      <Badge variant={isAlerted ? "danger" : "secondary"} className="text-xs">
                        {monthlyAbsences} {monthlyAbsences === 1 ? "falta" : "faltas"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <StudentContactModal
                        studentName={record.student.user.fullName}
                        studentPhone={record.student.user.phone}
                        parents={record.student.parentLinks.map((p) => ({
                          name: p.parent.fullName,
                          phone: p.parent.phone,
                        }))}
                      />
                    </td>
                  </tr>
                );
              })}
              {filteredAttendance.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhum registro encontrado para os filtros selecionados em {activeMonthName}/{activeYear}.
                  </td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <span className="text-slate-500">
                Mostrando {filteredAttendance.length} de {totalCount} registros
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={buildPageUrl(page - 1)}
                    className="rounded border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    ← Anterior
                  </Link>
                ) : (
                  <span className="rounded border border-slate-100 bg-slate-50 px-3 py-1.5 text-slate-400 cursor-not-allowed">
                    ← Anterior
                  </span>
                )}
                {page < totalPages ? (
                  <Link
                    href={buildPageUrl(page + 1)}
                    className="rounded border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Próxima →
                  </Link>
                ) : (
                  <span className="rounded border border-slate-100 bg-slate-50 px-3 py-1.5 text-slate-400 cursor-not-allowed">
                    Próxima →
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
