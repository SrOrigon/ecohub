import { getSessionUser } from "@/lib/auth";
import { getStudentById, getSchool } from "@/lib/queries";
import { fetchChildForParent } from "@/lib/reads/parent-reads";
import { getSchoolSettings } from "@/lib/school-settings";
import { prisma } from "@/lib/db";
import { BoletimView } from "@/components/boletim/boletim-view";
import { formatDate } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PrintBoletimButton } from "@/components/forms/print-boletim-button";

export default async function BoletimPage({ params }: { params: Promise<{ id: string }> }) {
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

  const backHref =
    user.role === "parent"
      ? `/dashboard/responsavel/filho/${id}`
      : user.role === "student"
        ? "/dashboard/aluno"
        : `/dashboard/alunos/${id}`;

  const backLabel =
    user.role === "parent"
      ? "← Voltar ao filho"
      : user.role === "student"
        ? "← Voltar ao meu perfil"
        : "← Voltar ao perfil";

  const payload = {
    studentName: student.user.fullName,
    avatarUrl: student.user.avatarUrl,
    enrollmentCode: student.enrollmentCode,
    email: student.user.email,
    className: student.classGroup?.name ?? null,
    schoolName: school?.name ?? "Ecohub",
    year: new Date().getFullYear(),
    passGrade: settings.academic.passGrade,
    maxGrade: settings.academic.maxGrade,
    schoolPeriods: settings.academic.periods,
    configuredSubjects: settings.academic.subjects,
    grades: student.grades.map((g) => ({
      id: g.id,
      subject: g.subject,
      value: g.value,
      maxValue: g.maxValue,
      period: g.period,
      createdAt: g.createdAt.toISOString(),
    })),
    attendance: attendanceRecords.map((a) => ({
      status: a.status,
      date: a.date.toISOString(),
    })),
    level: student.level,
    xpTotal: student.xpTotal,
    badgeCount: student.studentBadges.length,
    badgeNames: student.studentBadges.map((sb) => sb.badge.name),
  };

  return (
    <div className="boletim-print mx-auto w-full max-w-4xl space-y-6 bg-white p-4 text-slate-900 sm:p-8 print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <Link href={backHref} className="text-sm font-medium text-indigo-600 hover:underline">
          {backLabel}
        </Link>
        <PrintBoletimButton />
      </div>

      <header className="border-b-2 border-indigo-600 pb-4 text-center">
        <h1 className="page-title text-indigo-700">{payload.schoolName}</h1>
        <p className="text-sm text-slate-600">
          Boletim escolar · {payload.year}
          {payload.className ? ` · ${payload.className}` : ""}
        </p>
      </header>

      <BoletimView data={payload} />

      <footer className="border-t pt-4 text-center text-xs text-slate-500">
        Emitido em {formatDate(new Date())} · Ecohub  -  Gestão + Gamificação
      </footer>
    </div>
  );
}
