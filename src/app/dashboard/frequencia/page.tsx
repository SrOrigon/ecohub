import { getSessionUser } from "@/lib/auth";
import { getClasses } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordAttendanceForm } from "@/components/forms/record-attendance-form";
import { BulkAttendanceForm } from "@/components/forms/bulk-attendance-form";
import { JustificationsPanel } from "@/components/attendance/justifications-panel";
import { PageHeader } from "@/components/layout/page-header";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { formatDate } from "@/lib/utils";
import { getAttendance, getStudents } from "@/lib/queries";
import { fetchJustifiedAttendance } from "@/lib/reads/attendance-reads";
import { redirect } from "next/navigation";

const statusLabels: Record<string, { label: string; variant: "success" | "danger" | "warning" | "secondary" }> = {
  present: { label: "Presente", variant: "success" },
  absent: { label: "Falta", variant: "danger" },
  late: { label: "Atraso", variant: "warning" },
  justified: { label: "Justificada", variant: "secondary" },
};

export default async function FrequenciaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "student") redirect("/dashboard/aluno");

  const teacherFilter = user.role === "teacher" ? user.id : undefined;

  const [attendance, students, classes, justifications] = await Promise.all([
    getAttendance(user.schoolId),
    getStudents(user.schoolId),
    getClasses(user.schoolId, teacherFilter),
    user.schoolId
      ? fetchJustifiedAttendance(user, user.schoolId, teacherFilter)
      : Promise.resolve([]),
  ]);

  const classStudentIds = new Set(
    teacherFilter ? classes.flatMap((c) => c.students.map((s) => s.id)) : []
  );

  const filteredAttendance = teacherFilter
    ? attendance.filter((a) => classStudentIds.has(a.studentId))
    : attendance;

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

  const present = filteredAttendance.filter((a) => a.status === "present" || a.status === "late").length;
  const rate = filteredAttendance.length > 0 ? Math.round((present / filteredAttendance.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Frequência"
        description={`Presença diária com XP automático · Hoje: ${rate}% presentes`}
      >
        <BulkAttendanceForm classes={classesForBulk} />
        <RecordAttendanceForm students={studentOptions} />
      </PageHeader>

      <JustificationsPanel records={justifications} />

      <Card>
        <CardHeader>
          <CardTitle>Registros de hoje ({filteredAttendance.length})</CardTitle>
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
                    Nenhum registro hoje. Use &quot;Chamada por turma&quot; para registrar.
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
