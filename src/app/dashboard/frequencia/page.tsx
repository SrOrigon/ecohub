import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordAttendanceForm } from "@/components/forms/record-attendance-form";
import { BulkAttendanceForm } from "@/components/forms/bulk-attendance-form";
import { ImportAttendanceForm } from "@/components/forms/import-attendance-form";
import { JustificationsPanel } from "@/components/attendance/justifications-panel";
import { AttendanceFilterBar } from "@/components/attendance/attendance-filter-bar";
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
  }>;
}

export default async function FrequenciaPage(props: PageProps) {
  const user = await requirePageAccess(STAFF_ROLES);
  const params = (await props.searchParams) ?? {};

  const now = new Date();
  const activeMonth = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const activeYear = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const classIdFilter = params.classId || undefined;
  const statusFilter = params.status || "";
  const searchQuery = (params.q || "").toLowerCase().trim();

  const activeMonthName = monthNames[activeMonth - 1] ?? "Mês Vigente";

  const teacherFilter = user.role === "teacher" ? user.id : undefined;

  const [monthlyAttendance, students, classes, justifications] = await Promise.all([
    getMonthlyAttendance(user.schoolId, {
      month: activeMonth,
      year: activeYear,
      classId: classIdFilter,
    }),
    getStudents(user.schoolId),
    getClasses(user.schoolId, teacherFilter),
    user.schoolId
      ? fetchJustifiedAttendance(user, user.schoolId, teacherFilter)
      : Promise.resolve([]),
  ]);

  const classStudentIds = new Set(
    teacherFilter ? classes.flatMap((c) => c.students.map((s) => s.id)) : []
  );

  let filteredAttendance = teacherFilter
    ? monthlyAttendance.filter((a) => classStudentIds.has(a.studentId))
    : monthlyAttendance;

  if (statusFilter) {
    filteredAttendance = filteredAttendance.filter((a) => a.status === statusFilter);
  }

  if (searchQuery) {
    filteredAttendance = filteredAttendance.filter((a) =>
      a.student.user.fullName.toLowerCase().includes(searchQuery)
    );
  }

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

  // Calculations for quick metrics
  const totalMonthlyRecords = filteredAttendance.length;
  const totalAbsences = filteredAttendance.filter((a) => a.status === "absent").length;
  const presentCount = filteredAttendance.filter((a) => a.status === "present" || a.status === "late").length;
  const attendanceRate = totalMonthlyRecords > 0 ? Math.round((presentCount / totalMonthlyRecords) * 100) : 0;

  // Alert students (> 3 absences in selected month)
  const studentAbsenceMap = new Map<string, { id: string; name: string; className: string; absences: number }>();
  for (const record of (teacherFilter ? monthlyAttendance.filter((a) => classStudentIds.has(a.studentId)) : monthlyAttendance)) {
    if (record.status === "absent") {
      const existing = studentAbsenceMap.get(record.studentId);
      if (existing) {
        existing.absences++;
      } else {
        studentAbsenceMap.set(record.studentId, {
          id: record.studentId,
          name: record.student.user.fullName,
          className: record.classGroup.name,
          absences: 1,
        });
      }
    }
  }

  const alertedStudents = Array.from(studentAbsenceMap.values())
    .filter((s) => s.absences > 3)
    .sort((a, b) => b.absences - a.absences);

  const filterClasses = classes.map((c) => ({ id: c.id, name: c.name }));

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
              {presentCount} presentes em {totalMonthlyRecords} registros
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
              Ausências registradas em {activeMonthName}/{activeYear}
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
              ⚠️ Detalhamento dos Alunos em Alerta ({alertedStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {alertedStudents.map((s) => (
                <div key={s.id} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs text-amber-900 shadow-2xs">
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-slate-500">({s.className})</span>
                  <Badge variant="danger" className="ml-1 text-[10px] px-1.5 py-0">
                    {s.absences} faltas
                  </Badge>
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
        <CardHeader>
          <CardTitle>
            Registros de Frequência — {activeMonthName} de {activeYear} ({filteredAttendance.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <ResponsiveTable minWidth="36rem">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="hidden pb-3 pr-4 sm:table-cell">Data</th>
                <th className="pb-3 pr-4">Aluno</th>
                <th className="hidden pb-3 pr-4 md:table-cell">Turma</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.map((record) => {
                const status = statusLabels[record.status] ?? statusLabels.present;
                return (
                  <tr key={record.id} className="border-b border-slate-100">
                    <td className="hidden py-3 pr-4 sm:table-cell">{formatDate(record.date)}</td>
                    <td className="max-w-[8rem] py-3 pr-4 sm:max-w-none">{record.student.user.fullName}</td>
                    <td className="hidden py-3 pr-4 md:table-cell">{record.classGroup.name}</td>
                    <td className="py-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {record.justificationNote && (
                        <p className="mt-1 max-w-xs text-xs text-slate-500">{record.justificationNote}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredAttendance.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Nenhum registro encontrado para os filtros selecionados em {activeMonthName}/{activeYear}.
                  </td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </div>
  );
}
