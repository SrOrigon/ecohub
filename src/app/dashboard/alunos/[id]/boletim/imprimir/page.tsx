import { getSessionUser } from "@/lib/auth";
import { getStudentById, getSchool } from "@/lib/queries";
import { fetchChildForParent } from "@/lib/reads/parent-reads";
import { getSchoolSettings } from "@/lib/school-settings";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { PrintableOfficialBoletim, type PrintableBoletimSubject } from "@/components/boletim/printable-official-boletim";

export default async function PrintableBoletimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;

  if (user.role === "parent") {
    const link = await fetchChildForParent(user, user.id, id);
    if (!link) notFound();
  }

  if (user.role === "student") {
    const own = await prisma.student.findFirst({ where: { userId: user.id } });
    if (!own || own.id !== id) notFound();
  }

  const [student, school, settings, attendanceRecords] = await Promise.all([
    getStudentById(id, user.schoolId),
    getSchool(user),
    getSchoolSettings(user.schoolId),
    prisma.attendance.findMany({
      where: { studentId: id },
      orderBy: { date: "desc" },
      take: 120,
      select: { status: true, date: true },
    }),
  ]);

  if (!student) notFound();

  // Agrupa notas por disciplina
  const subjectsMap = new Map<string, typeof student.grades>();
  for (const grade of student.grades) {
    const list = subjectsMap.get(grade.subject) ?? [];
    list.push(grade);
    subjectsMap.set(grade.subject, list);
  }

  const defaultSubjects = settings.academic?.subjects ?? ["Matemática", "Português", "História", "Geografia", "Ciências"];
  for (const subj of defaultSubjects) {
    if (!subjectsMap.has(subj)) {
      subjectsMap.set(subj, []);
    }
  }

  const presentCount = attendanceRecords.filter((r) => r.status === "present").length;
  const totalDays = Math.max(1, attendanceRecords.length);
  const attendanceRate = Math.min(100, Math.round((presentCount / totalDays) * 100));
  const absences = attendanceRecords.filter((r) => r.status === "absent").length;

  const subjects: PrintableBoletimSubject[] = Array.from(subjectsMap.entries()).map(([name, grades]) => {
    const b1 = grades.find((g) => g.period === "1b")?.value ?? null;
    const b2 = grades.find((g) => g.period === "2b")?.value ?? null;
    const b3 = grades.find((g) => g.period === "3b")?.value ?? null;
    const b4 = grades.find((g) => g.period === "4b")?.value ?? null;

    const validGrades = [b1, b2, b3, b4].filter((v): v is number => v !== null);
    const finalAverage = validGrades.length > 0 ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length : null;

    let status: PrintableBoletimSubject["status"] = "Em Curso";
    if (finalAverage !== null) {
      if (finalAverage >= 6) status = "Aprovado";
      else if (finalAverage >= 4) status = "Recuperação";
      else status = "Atenção";
    }

    return {
      name,
      b1,
      b2,
      b3,
      b4,
      finalAverage,
      absences: Math.floor(absences / Math.max(1, subjectsMap.size)),
      status,
    };
  });

  const allValidFinals = subjects.map((s) => s.finalAverage).filter((v): v is number => v !== null);
  const overallAverage = allValidFinals.length > 0 ? allValidFinals.reduce((a, b) => a + b, 0) / allValidFinals.length : 0;

  // Código de verificação digital determinístico
  const verificationHash = `ECO-${student.id.slice(-6).toUpperCase()}-${new Date().getFullYear()}`;

  return (
    <PrintableOfficialBoletim
      data={{
        schoolName: school?.name ?? "Ecohub Instituição de Ensino",
        schoolSlug: school?.slug,
        schoolCityState: school ? `${school.city ?? "Brasília"} - ${school.state ?? "DF"}` : null,
        studentId: student.id,
        studentName: student.user.fullName,
        enrollmentCode: student.enrollmentCode,
        className: student.classGroup?.name ?? "Turma Regular",
        academicYear: new Date().getFullYear(),
        overallAverage,
        overallAttendanceRate: attendanceRate,
        totalAbsences: absences,
        subjects,
        issuedAt: new Date().toLocaleDateString("pt-BR"),
        verificationHash,
      }}
    />
  );
}
