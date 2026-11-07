import { prisma } from "@/lib/db";
import { listBillingCharges } from "@/lib/billing-charges";
import { formatBRL } from "@/lib/student-finance";
import { formatDate } from "@/lib/utils";
import { REPORT_CATALOG } from "@/lib/report-catalog";
import { loadExtendedReport } from "@/lib/school-report-extra";

export type OperationalReportId = string;

export type ReportFilters = {
  tipo?: string;
  turma?: string;
  aluno?: string;
  de?: string;
  ate?: string;
  ordem?: string;
  situacao?: string;
  visualizar?: string;
  minFaltas?: string;
  nome?: string;
};

export type OperationalReportTable = {
  id: OperationalReportId;
  title: string;
  schoolName: string;
  columns: string[];
  rows: string[][];
  empty: string;
};

type ClassOption = { id: string; name: string };
type StudentOption = { id: string; name: string };

function isReportId(value: string | undefined): value is string {
  return REPORT_CATALOG.some((item) => item.id === value);
}

function parseDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function monthDay(date: Date) {
  return date.getMonth() * 32 + date.getDate();
}

function statusLabel(status: string) {
  if (status === "active") return "Cursando";
  if (status === "inactive") return "Inativo";
  return status;
}

function classLabel(student: {
  classGroup: { name: string } | null;
  classEnrollments: Array<{ classGroup: { name: string } }>;
}) {
  const names = new Set<string>();
  if (student.classGroup?.name) names.add(student.classGroup.name);
  for (const enrollment of student.classEnrollments) names.add(enrollment.classGroup.name);
  return [...names].join(", ") || "Sem turma";
}

function birthdayLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

export async function loadReportOptions(schoolId: string, teacherId?: string) {
  const classWhere = teacherId
    ? { schoolId, OR: [{ teacherId }, { coTeachers: { some: { teacherId } } }] }
    : { schoolId };
  const [classes, students] = await Promise.all([
    prisma.classGroup.findMany({
      where: classWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: {
        user: { schoolId },
        ...(teacherId
          ? {
              OR: [
                { classGroup: { OR: [{ teacherId }, { coTeachers: { some: { teacherId } } }] } },
                { classEnrollments: { some: { classGroup: { OR: [{ teacherId }, { coTeachers: { some: { teacherId } } }] } } } },
              ],
            }
          : {}),
      },
      select: { id: true, user: { select: { fullName: true } } },
      orderBy: { user: { fullName: "asc" } },
    }),
  ]);
  return {
    classes: classes satisfies ClassOption[],
    students: students.map((student) => ({ id: student.id, name: student.user.fullName })) satisfies StudentOption[],
  };
}

export async function loadOperationalReport(
  schoolId: string,
  schoolName: string,
  filters: ReportFilters,
  teacherId?: string
): Promise<OperationalReportTable | null> {
  if (!isReportId(filters.tipo)) return null;
  const options = await loadReportOptions(schoolId, teacherId);
  const allowedClassIds = new Set(options.classes.map((item) => item.id));
  const classId = filters.turma && allowedClassIds.has(filters.turma) ? filters.turma : undefined;
  const studentId = filters.aluno && options.students.some((item) => item.id === filters.aluno) ? filters.aluno : undefined;
  const from = parseDate(filters.de);
  const to = parseDate(filters.ate);
  const toEnd = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999) : null;

  if (filters.tipo === "aniversariantes") return birthdays(schoolId, schoolName, { classId, from, to, order: filters.ordem, status: filters.situacao });
  if (filters.tipo === "cadastro") return registry(schoolId, schoolName, { classId, status: filters.situacao, name: filters.nome, order: filters.ordem });
  if (filters.tipo === "historico") return history(schoolId, schoolName, { classId, studentId, from, toEnd, status: filters.situacao });
  if (filters.tipo === "frequencia") return attendanceReport(schoolId, schoolName, { classId, studentId, from, toEnd, view: filters.visualizar, minAbsences: Number(filters.minFaltas) });
  if (filters.tipo === "diario") return diary(schoolId, schoolName, { classId, from, toEnd, teacherId });
  if (filters.tipo === "financeiro") return financeReport(schoolId, schoolName, { classId, studentId, view: filters.visualizar });
  return loadExtendedReport(filters.tipo, {
    schoolId,
    schoolName,
    classId,
    studentId,
    from,
    toEnd,
    name: filters.nome,
    view: filters.visualizar,
    minAbsences: Number(filters.minFaltas),
  });
}

async function birthdays(
  schoolId: string,
  schoolName: string,
  input: { classId?: string; from: Date | null; to: Date | null; order?: string; status?: string }
): Promise<OperationalReportTable> {
  const status = input.status ?? "active";
  const students = await prisma.student.findMany({
    where: {
      user: { schoolId },
      birthDate: { not: null },
      ...(status === "inactive" ? { status: "inactive" } : status === "todos" ? {} : { status: "active" }),
      ...(input.classId
        ? { OR: [{ classId: input.classId }, { classEnrollments: { some: { classId: input.classId, status: "active" } } }] }
        : {}),
    },
    select: {
      birthDate: true,
      user: { select: { fullName: true } },
      classGroup: { select: { name: true } },
      classEnrollments: { where: { status: "active" }, select: { classGroup: { select: { name: true } } } },
    },
  });

  const start = input.from ? monthDay(input.from) : null;
  const end = input.to ? monthDay(input.to) : null;
  const rows = students
    .filter((student) => student.birthDate)
    .map((student) => ({ student, birth: student.birthDate as Date }))
    .filter(({ birth }) => {
      if (start == null || end == null) return true;
      const value = monthDay(birth);
      return start <= end ? value >= start && value <= end : value >= start || value <= end;
    })
    .sort((a, b) =>
      input.order === "nascimento"
        ? monthDay(a.birth) - monthDay(b.birth) || a.student.user.fullName.localeCompare(b.student.user.fullName, "pt-BR")
        : a.student.user.fullName.localeCompare(b.student.user.fullName, "pt-BR")
    )
    .map(({ student, birth }) => [student.user.fullName, birthdayLabel(birth), classLabel(student)]);

  return {
    id: "aniversariantes",
    title: "Alunos aniversariantes",
    schoolName,
    columns: ["Nome", "Aniversário", "Turma"],
    rows,
    empty: "Nenhum aniversariante neste filtro.",
  };
}

async function registry(
  schoolId: string,
  schoolName: string,
  input: { classId?: string; status?: string; name?: string; order?: string }
): Promise<OperationalReportTable> {
  const term = input.name?.trim();
  const status = input.status ?? "active";
  const students = await prisma.student.findMany({
    where: {
      user: {
        schoolId,
        ...(term ? { fullName: { contains: term } } : {}),
      },
      ...(status === "inactive" ? { status: "inactive" } : status === "todos" ? {} : { status: "active" }),
      ...(input.classId
        ? { OR: [{ classId: input.classId }, { classEnrollments: { some: { classId: input.classId, status: "active" } } }] }
        : {}),
    },
    select: {
      enrollmentCode: true,
      status: true,
      user: { select: { fullName: true, email: true, phone: true } },
      classGroup: { select: { name: true } },
      classEnrollments: { where: { status: "active" }, select: { classGroup: { select: { name: true } } } },
    },
    orderBy: { user: { fullName: "asc" } },
    take: 500,
  });
  const rows = students.map((student) => [
    student.user.fullName,
    student.enrollmentCode,
    classLabel(student),
    statusLabel(student.status),
    student.user.email,
    student.user.phone ?? "—",
  ]);
  if (input.order === "turma") rows.sort((a, b) => a[2].localeCompare(b[2], "pt-BR") || a[0].localeCompare(b[0], "pt-BR"));
  return {
    id: "cadastro",
    title: "Relatório de alunos",
    schoolName,
    columns: ["Nome", "Matrícula", "Turma", "Situação", "E-mail", "Celular"],
    rows,
    empty: "Nenhum aluno encontrado com esses filtros.",
  };
}

async function history(
  schoolId: string,
  schoolName: string,
  input: { classId?: string; studentId?: string; from: Date | null; toEnd: Date | null; status?: string }
): Promise<OperationalReportTable> {
  const status = input.status ?? "active";
  const students = await prisma.student.findMany({
    where: {
      user: { schoolId },
      ...(status === "inactive" ? { status: "inactive" } : status === "todos" ? {} : { status: "active" }),
      ...(input.studentId ? { id: input.studentId } : {}),
      ...(input.classId
        ? { OR: [{ classId: input.classId }, { classEnrollments: { some: { classId: input.classId, status: "active" } } }] }
        : {}),
    },
    select: {
      id: true,
      status: true,
      user: { select: { fullName: true } },
      classGroup: { select: { name: true } },
      classEnrollments: { where: { status: "active" }, select: { classGroup: { select: { name: true } } } },
      _count: { select: { tuitionPayments: true } },
    },
    orderBy: { user: { fullName: "asc" } },
    take: input.studentId ? 1 : 300,
  });
  const ids = students.map((student) => student.id);
  const absences = ids.length
    ? await prisma.attendance.groupBy({
        by: ["studentId"],
        where: {
          studentId: { in: ids },
          status: "absent",
          ...(input.from || input.toEnd ? { date: { ...(input.from ? { gte: input.from } : {}), ...(input.toEnd ? { lte: input.toEnd } : {}) } } : {}),
        },
        _count: { _all: true },
      })
    : [];
  const absenceByStudent = new Map(absences.map((item) => [item.studentId, item._count._all]));
  return {
    id: "historico",
    title: "Histórico geral do aluno",
    schoolName,
    columns: ["Nome", "Turma", "Situação", "Pagamentos registrados", "Faltas"],
    rows: students.map((student) => [
      student.user.fullName,
      classLabel(student),
      statusLabel(student.status),
      String(student._count.tuitionPayments),
      String(absenceByStudent.get(student.id) ?? 0),
    ]),
    empty: "Nenhum aluno neste filtro.",
  };
}

async function attendanceReport(
  schoolId: string,
  schoolName: string,
  input: { classId?: string; studentId?: string; from: Date | null; toEnd: Date | null; view?: string; minAbsences: number }
): Promise<OperationalReportTable> {
  const records = await prisma.attendance.groupBy({
    by: ["studentId", "status"],
    where: {
      classGroup: { schoolId },
      ...(input.classId ? { classId: input.classId } : {}),
      ...(input.studentId ? { studentId: input.studentId } : {}),
      ...(input.from || input.toEnd ? { date: { ...(input.from ? { gte: input.from } : {}), ...(input.toEnd ? { lte: input.toEnd } : {}) } } : {}),
    },
    _count: { _all: true },
  });
  const byStudent = new Map<string, { present: number; absent: number; late: number }>();
  for (const record of records) {
    const current = byStudent.get(record.studentId) ?? { present: 0, absent: 0, late: 0 };
    if (record.status === "present") current.present += record._count._all;
    else if (record.status === "absent") current.absent += record._count._all;
    else if (record.status === "late") current.late += record._count._all;
    byStudent.set(record.studentId, current);
  }
  const students = byStudent.size
    ? await prisma.student.findMany({
        where: { id: { in: [...byStudent.keys()] }, user: { schoolId } },
        select: {
          id: true,
          user: { select: { fullName: true } },
          classGroup: { select: { name: true } },
          classEnrollments: { where: { status: "active" }, select: { classGroup: { select: { name: true } } } },
        },
      })
    : [];
  const minimum = Number.isFinite(input.minAbsences) && input.minAbsences > 0 ? input.minAbsences : 0;
  const rows = students
    .map((student) => {
      const counts = byStudent.get(student.id) ?? { present: 0, absent: 0, late: 0 };
      return { student, counts };
    })
    .filter(({ counts }) => {
      if (counts.absent < minimum) return false;
      if (input.view === "faltas") return counts.absent > 0;
      if (input.view === "presencas") return counts.present + counts.late > 0;
      return true;
    })
    .sort((a, b) => a.student.user.fullName.localeCompare(b.student.user.fullName, "pt-BR"))
    .map(({ student, counts }) => [
      student.user.fullName,
      classLabel(student),
      String(counts.present),
      String(counts.absent),
      String(counts.late),
    ]);
  return {
    id: "frequencia",
    title: "Frequência de alunos",
    schoolName,
    columns: ["Nome", "Turma", "Presenças", "Faltas", "Atrasos"],
    rows,
    empty: "Nenhuma frequência lançada neste filtro.",
  };
}

async function diary(
  schoolId: string,
  schoolName: string,
  input: { classId?: string; from: Date | null; toEnd: Date | null; teacherId?: string }
): Promise<OperationalReportTable> {
  const entries = await prisma.classDiaryEntry.findMany({
    where: {
      classGroup: {
        schoolId,
        ...(input.classId ? { id: input.classId } : {}),
        ...(input.teacherId ? { OR: [{ teacherId: input.teacherId }, { coTeachers: { some: { teacherId: input.teacherId } } }] } : {}),
      },
      ...(input.from || input.toEnd ? { date: { ...(input.from ? { gte: input.from } : {}), ...(input.toEnd ? { lte: input.toEnd } : {}) } } : {}),
    },
    select: {
      date: true,
      subject: true,
      content: true,
      classGroup: { select: { name: true } },
      teacher: { select: { fullName: true } },
    },
    orderBy: { date: "desc" },
    take: 300,
  });
  return {
    id: "diario",
    title: "Diário de classe",
    schoolName,
    columns: ["Data", "Turma", "Professor", "Disciplina", "Conteúdo"],
    rows: entries.map((entry) => [
      formatDate(entry.date),
      entry.classGroup.name,
      entry.teacher.fullName,
      entry.subject || "—",
      entry.content,
    ]),
    empty: "Nenhuma aula registrada no diário neste filtro.",
  };
}

async function financeReport(
  schoolId: string,
  schoolName: string,
  input: { classId?: string; studentId?: string; view?: string }
): Promise<OperationalReportTable> {
  const className = input.classId
    ? (await prisma.classGroup.findFirst({ where: { id: input.classId, schoolId }, select: { name: true } }))?.name
    : undefined;
  const charges = await listBillingCharges(schoolId, input.studentId);
  const rows = charges
    .filter((charge) => (className ? charge.className === className : true))
    .filter((charge) => {
      if (input.view === "pendentes") return charge.standing === "overdue" || charge.standing === "due";
      if (input.view === "quitadas") return charge.standing === "paid";
      if (input.view === "avencer") return charge.standing === "upcoming";
      return true;
    })
    .map((charge) => [
      charge.studentName,
      charge.className ?? "Sem turma",
      charge.title,
      formatDate(charge.dueDate),
      formatBRL(charge.amountCents),
      charge.standingLabel,
      charge.paidAt ? formatDate(charge.paidAt) : "—",
    ]);
  return {
    id: "financeiro",
    title: "Parcelas e situação",
    schoolName,
    columns: ["Aluno", "Turma", "Categoria", "Vencimento", "Valor", "Situação", "Pagamento"],
    rows,
    empty: "Nenhuma parcela neste filtro.",
  };
}
