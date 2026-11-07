import { prisma } from "@/lib/db";
import { listBillingCharges } from "@/lib/billing-charges";
import { getSchoolSettings } from "@/lib/school-settings";
import { formatBRL } from "@/lib/student-finance";
import { formatDate } from "@/lib/utils";
import type { BillingCharge } from "@/lib/billing-status";

type ReportTable = {
  id: string;
  title: string;
  schoolName: string;
  columns: string[];
  rows: string[][];
  empty: string;
};

export type ExtraReportContext = {
  schoolId: string;
  schoolName: string;
  classId?: string;
  studentId?: string;
  from: Date | null;
  toEnd: Date | null;
  name?: string;
  view?: string;
  minAbsences: number;
};

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function result(
  id: string,
  title: string,
  schoolName: string,
  columns: string[],
  rows: string[][],
  empty: string
): ReportTable {
  return { id, title, schoolName, columns, rows, empty };
}

function classNames(student: {
  classGroup: { name: string } | null;
  classEnrollments: Array<{ classGroup: { name: string } }>;
}) {
  const names = new Set<string>();
  if (student.classGroup?.name) names.add(student.classGroup.name);
  for (const item of student.classEnrollments) names.add(item.classGroup.name);
  return [...names].join(", ") || "Sem turma";
}

function period(from: Date | null, toEnd: Date | null) {
  if (!from && !toEnd) return {};
  return { ...(from ? { gte: from } : {}), ...(toEnd ? { lte: toEnd } : {}) };
}

function classFilter(classId?: string) {
  if (!classId) return {};
  return { OR: [{ classId }, { classEnrollments: { some: { classId, status: "active" } } }] };
}

export async function loadExtendedReport(id: string, ctx: ExtraReportContext): Promise<ReportTable | null> {
  switch (id) {
    case "alunos-situacao":
      return studentsByStatus(ctx);
    case "pessoas-sem-foto":
      return peopleWithoutPhoto(ctx);
    case "matriculas":
      return enrollments(ctx);
    case "abandonos":
      return inactiveStudents(ctx);
    case "acompanhamento":
      return activities(ctx);
    case "agendamentos":
      return appointments(ctx);
    case "conselho":
      return gradesOutlook(ctx, "conselho");
    case "exame":
      return gradesOutlook(ctx, "exame");
    case "recuperacao":
      return gradesOutlook(ctx, "recuperacao");
    case "faltantes":
      return absentees(ctx);
    case "atividades":
      return homeTasks(ctx);
    case "aulas-livres":
      return classesWithoutTeacher(ctx);
    case "dependencias":
      return subjectDebts(ctx);
    case "diario-individual":
      return individualDiary(ctx);
    case "disponibilidade":
      return teacherAvailability(ctx);
    case "info-matriculas":
      return classEnrollments(ctx);
    case "mapa-salas":
      return rooms(ctx);
    case "mudancas-turma":
      return classChanges(ctx);
    case "notas-disciplina":
      return gradesBySubject(ctx);
    case "ocorrencias":
      return occurrences(ctx);
    case "previsao-notas":
      return gradesOutlook(ctx, "previsao");
    case "professores-pendentes":
      return teachersPending(ctx);
    case "professores-turma":
      return teachersByClass(ctx);
    case "documentos":
      return documents(ctx);
    case "estoque-itens":
      return stockItems(ctx);
    case "estoque-saidas":
      return stockExits(ctx);
    case "estoque-entradas":
      return stockEntries(ctx);
    case "parcelas-pendentes":
      return pendingByStudent(ctx);
    case "balancete":
      return balance(ctx);
    case "balancete-aluno":
      return balanceByStudent(ctx);
    case "contas-receber":
      return receivable(ctx);
    case "fluxo":
      return cashflow(ctx);
    case "recebimentos":
      return receipts(ctx, false);
    case "log-recibos":
      return receipts(ctx, true);
    case "sintetico-categoria":
      return byCategory(ctx);
    case "valores-curso":
      return byCourse(ctx);
    case "valores-turma":
      return byClassAmount(ctx);
    case "ticket-medio":
      return averageTicket(ctx);
    case "comunicados":
      return announcements(ctx);
    case "funcionarios":
      return staff(ctx);
    case "log-acessos":
      return accessLog(ctx);
    case "log-exclusao":
      return auditLog(ctx, true);
    case "log-auditoria":
      return auditLog(ctx, false);
    case "sintetico-turma":
      return classSummary(ctx);
    default:
      return null;
  }
}

async function studentsByStatus(ctx: ExtraReportContext) {
  const rows = await prisma.student.groupBy({
    by: ["status"],
    where: { user: { schoolId: ctx.schoolId }, ...classFilter(ctx.classId) },
    _count: { _all: true },
  });
  return result(
    "alunos-situacao",
    "Alunos por situação",
    ctx.schoolName,
    ["Situação", "Quantidade"],
    rows.map((row) => [row.status === "active" ? "Cursando" : row.status === "inactive" ? "Inativo" : row.status, String(row._count._all)]),
    "Nenhum aluno nesta turma."
  );
}

async function peopleWithoutPhoto(ctx: ExtraReportContext) {
  const term = ctx.name?.trim();
  const people = await prisma.user.findMany({
    where: {
      schoolId: ctx.schoolId,
      avatarUrl: null,
      ...(term ? { fullName: { contains: term } } : {}),
    },
    select: { fullName: true, role: true, email: true },
    orderBy: { fullName: "asc" },
    take: 400,
  });
  const roleLabel: Record<string, string> = {
    student: "Aluno",
    parent: "Responsável",
    teacher: "Professor",
    secretary: "Secretaria",
    director: "Direção",
    admin: "Administração",
  };
  return result(
    "pessoas-sem-foto",
    "Pessoas sem fotos",
    ctx.schoolName,
    ["Nome", "Papel", "E-mail"],
    people.map((person) => [person.fullName, roleLabel[person.role] ?? person.role, person.email]),
    "Todas as pessoas desta busca já têm foto."
  );
}

async function inactiveStudents(ctx: ExtraReportContext) {
  const students = await prisma.student.findMany({
    where: { user: { schoolId: ctx.schoolId }, status: "inactive", ...classFilter(ctx.classId) },
    select: {
      enrollmentCode: true,
      user: { select: { fullName: true } },
      classGroup: { select: { name: true } },
      classEnrollments: { select: { classGroup: { select: { name: true } } } },
    },
    orderBy: { user: { fullName: "asc" } },
  });
  return result(
    "abandonos",
    "Abandonos",
    ctx.schoolName,
    ["Nome", "Matrícula", "Turma"],
    students.map((student) => [student.user.fullName, student.enrollmentCode, classNames(student)]),
    "Nenhum aluno inativo neste filtro."
  );
}

async function activities(ctx: ExtraReportContext) {
  const items = await prisma.studentActivity.findMany({
    where: {
      student: { user: { schoolId: ctx.schoolId }, ...(ctx.studentId ? { id: ctx.studentId } : {}), ...classFilter(ctx.classId) },
      ...(ctx.from || ctx.toEnd ? { occurredAt: period(ctx.from, ctx.toEnd) } : {}),
    },
    select: { occurredAt: true, type: true, title: true, detail: true, student: { select: { user: { select: { fullName: true } } } } },
    orderBy: { occurredAt: "desc" },
    take: 300,
  });
  return result(
    "acompanhamento",
    "Acompanhamento",
    ctx.schoolName,
    ["Data", "Aluno", "Tipo", "Título", "Detalhe"],
    items.map((item) => [formatDate(item.occurredAt), item.student.user.fullName, item.type, item.title, item.detail ?? "—"]),
    "Nenhuma atividade registrada neste filtro."
  );
}

async function appointments(ctx: ExtraReportContext) {
  const items = await prisma.appointment.findMany({
    where: { schoolId: ctx.schoolId, ...(ctx.from || ctx.toEnd ? { date: period(ctx.from, ctx.toEnd) } : {}) },
    select: {
      date: true,
      startTime: true,
      endTime: true,
      studentName: true,
      status: true,
      service: { select: { name: true } },
      instructor: { select: { user: { select: { fullName: true } } } },
    },
    orderBy: { date: "desc" },
    take: 300,
  });
  return result(
    "agendamentos",
    "Agendamentos",
    ctx.schoolName,
    ["Data", "Horário", "Aluno", "Serviço", "Profissional", "Situação"],
    items.map((item) => [formatDate(item.date), `${item.startTime}–${item.endTime}`, item.studentName, item.service.name, item.instructor.user.fullName, item.status]),
    "Nenhum agendamento neste período."
  );
}

async function loadGrades(ctx: ExtraReportContext) {
  return prisma.grade.findMany({
    where: {
      student: { user: { schoolId: ctx.schoolId }, ...(ctx.studentId ? { id: ctx.studentId } : {}), ...classFilter(ctx.classId) },
    },
    select: {
      subject: true,
      value: true,
      maxValue: true,
      period: true,
      student: {
        select: {
          id: true,
          user: { select: { fullName: true } },
          classGroup: { select: { name: true, gradeLevel: true } },
        },
      },
    },
    take: 4000,
  });
}

async function gradesOutlook(ctx: ExtraReportContext, mode: "conselho" | "exame" | "recuperacao" | "previsao") {
  const settings = await getSchoolSettings(ctx.schoolId);
  const pass = settings.academic.passGrade;
  const grades = await loadGrades(ctx);
  const grouped = new Map<string, { name: string; className: string; total: number; count: number }>();
  for (const grade of grades) {
    const current = grouped.get(grade.student.id) ?? {
      name: grade.student.user.fullName,
      className: grade.student.classGroup?.name ?? "Sem turma",
      total: 0,
      count: 0,
    };
    const normalized = grade.maxValue > 0 ? (grade.value / grade.maxValue) * 10 : grade.value;
    current.total += normalized;
    current.count += 1;
    grouped.set(grade.student.id, current);
  }
  const rows = [...grouped.values()]
    .map((item) => ({ ...item, average: item.count ? item.total / item.count : 0 }))
    .filter((item) => {
      if (mode === "recuperacao") return item.average < pass;
      if (mode === "exame") return item.average < pass && item.average >= pass - 2;
      return true;
    })
    .sort((a, b) => a.average - b.average)
    .map((item) => {
      const gap = Math.max(0, pass - item.average);
      return [item.name, item.className, item.average.toFixed(1), pass.toFixed(1), gap === 0 ? "Na meta" : gap.toFixed(1)];
    });
  const title =
    mode === "exame" ? "Alunos em exame final" : mode === "recuperacao" ? "Alunos em recuperação" : mode === "previsao" ? "Previsão de notas para aprovação" : "Alunos em conselho de classe";
  return result(mode === "conselho" ? "conselho" : mode === "previsao" ? "previsao-notas" : mode === "exame" ? "exame" : "recuperacao", title, ctx.schoolName, ["Aluno", "Turma", "Média", "Nota mínima", "Falta para aprovar"], rows, "Nenhuma nota lançada neste filtro.");
}

async function absentees(ctx: ExtraReportContext) {
  const grouped = await prisma.attendance.groupBy({
    by: ["studentId"],
    where: {
      status: "absent",
      classGroup: { schoolId: ctx.schoolId },
      ...(ctx.classId ? { classId: ctx.classId } : {}),
      ...(ctx.from || ctx.toEnd ? { date: period(ctx.from, ctx.toEnd) } : {}),
    },
    _count: { _all: true },
  });
  const minimum = ctx.minAbsences > 0 ? ctx.minAbsences : 1;
  const ids = grouped.filter((item) => item._count._all >= minimum).map((item) => item.studentId);
  const students = ids.length
    ? await prisma.student.findMany({
        where: { id: { in: ids } },
        select: { id: true, user: { select: { fullName: true } }, classGroup: { select: { name: true } }, classEnrollments: { where: { status: "active" }, select: { classGroup: { select: { name: true } } } } },
      })
    : [];
  const count = new Map(grouped.map((item) => [item.studentId, item._count._all]));
  return result(
    "faltantes",
    "Alunos faltantes",
    ctx.schoolName,
    ["Aluno", "Turma", "Faltas"],
    students
      .sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0))
      .map((student) => [student.user.fullName, classNames(student), String(count.get(student.id) ?? 0)]),
    "Nenhum aluno atingiu esse número de faltas."
  );
}

async function homeTasks(ctx: ExtraReportContext) {
  const tasks = await prisma.homeTask.findMany({
    where: {
      student: { user: { schoolId: ctx.schoolId }, ...(ctx.studentId ? { id: ctx.studentId } : {}), ...classFilter(ctx.classId) },
      ...(ctx.from || ctx.toEnd ? { createdAt: period(ctx.from, ctx.toEnd) } : {}),
    },
    select: { title: true, status: true, dueDate: true, student: { select: { user: { select: { fullName: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return result(
    "atividades",
    "Atividades complementares",
    ctx.schoolName,
    ["Aluno", "Atividade", "Situação", "Prazo"],
    tasks.map((task) => [task.student.user.fullName, task.title, task.status, task.dueDate ? formatDate(task.dueDate) : "—"]),
    "Nenhuma atividade complementar neste filtro."
  );
}

async function classesWithoutTeacher(ctx: ExtraReportContext) {
  const classes = await prisma.classGroup.findMany({
    where: { schoolId: ctx.schoolId, teacherId: null },
    select: { name: true, gradeLevel: true, _count: { select: { students: true } } },
    orderBy: { name: "asc" },
  });
  return result(
    "aulas-livres",
    "Aulas livres",
    ctx.schoolName,
    ["Turma", "Curso", "Alunos"],
    classes.map((item) => [item.name, item.gradeLevel, String(item._count.students)]),
    "Todas as turmas já têm professor responsável."
  );
}

async function subjectDebts(ctx: ExtraReportContext) {
  const settings = await getSchoolSettings(ctx.schoolId);
  const pass = settings.academic.passGrade;
  const grades = await loadGrades(ctx);
  const grouped = new Map<string, { student: string; className: string; subject: string; total: number; count: number }>();
  for (const grade of grades) {
    const key = `${grade.student.id}:${grade.subject}`;
    const current = grouped.get(key) ?? { student: grade.student.user.fullName, className: grade.student.classGroup?.name ?? "Sem turma", subject: grade.subject, total: 0, count: 0 };
    current.total += grade.value;
    current.count += 1;
    grouped.set(key, current);
  }
  const rows = [...grouped.values()]
    .map((item) => ({ ...item, average: item.total / item.count }))
    .filter((item) => item.average < pass)
    .sort((a, b) => a.student.localeCompare(b.student, "pt-BR"))
    .map((item) => [item.student, item.className, item.subject, item.average.toFixed(1), pass.toFixed(1)]);
  return result("dependencias", "Dependências", ctx.schoolName, ["Aluno", "Turma", "Disciplina", "Média", "Nota mínima"], rows, "Nenhuma disciplina abaixo da nota mínima.");
}

async function individualDiary(ctx: ExtraReportContext) {
  if (!ctx.studentId) {
    return result("diario-individual", "Diário de classe individual", ctx.schoolName, ["Data", "Registro"], [], "Escolha um aluno e clique em Visualizar.");
  }
  const attendance = await prisma.attendance.findMany({
    where: { studentId: ctx.studentId, ...(ctx.classId ? { classId: ctx.classId } : {}), ...(ctx.from || ctx.toEnd ? { date: period(ctx.from, ctx.toEnd) } : {}) },
    select: { date: true, status: true, classGroup: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 200,
  });
  const label: Record<string, string> = { present: "Presente", absent: "Falta", late: "Atraso" };
  return result(
    "diario-individual",
    "Diário de classe individual",
    ctx.schoolName,
    ["Data", "Turma", "Frequência"],
    attendance.map((item) => [formatDate(item.date), item.classGroup.name, label[item.status] ?? item.status]),
    "Nenhuma frequência lançada para este aluno."
  );
}

async function teacherAvailability(ctx: ExtraReportContext) {
  const [availability, slots] = await Promise.all([
    prisma.instructorAvailability.findMany({
      where: { isActive: true, instructor: { schoolId: ctx.schoolId } },
      select: { dayOfWeek: true, startTime: true, endTime: true, instructor: { select: { user: { select: { fullName: true } } } } },
    }),
    prisma.classScheduleSlot.findMany({
      where: { schoolId: ctx.schoolId },
      select: { weekday: true, startTime: true, endTime: true, subject: true, room: true, classGroup: { select: { name: true, teacher: { select: { fullName: true } } } } },
      take: 400,
    }),
  ]);
  const rows = [
    ...availability.map((item) => [item.instructor.user.fullName, "Disponível", WEEKDAYS[item.dayOfWeek] ?? String(item.dayOfWeek), `${item.startTime}–${item.endTime}`, "—", "—"]),
    ...slots.map((item) => [item.classGroup.teacher?.fullName ?? "Sem professor", item.classGroup.name, WEEKDAYS[item.weekday] ?? String(item.weekday), `${item.startTime}–${item.endTime}`, item.subject, item.room ?? "—"]),
  ];
  return result("disponibilidade", "Disponibilidade de professores", ctx.schoolName, ["Professor", "Turma ou tipo", "Dia", "Horário", "Disciplina", "Sala"], rows, "Nenhum horário de professor ou de turma cadastrado.");
}

async function classEnrollments(ctx: ExtraReportContext) {
  const links = await prisma.studentClassEnrollment.findMany({
    where: { status: "active", classGroup: { schoolId: ctx.schoolId }, ...(ctx.classId ? { classId: ctx.classId } : {}) },
    select: { enrolledAt: true, student: { select: { enrollmentCode: true, user: { select: { fullName: true } } } }, classGroup: { select: { name: true } } },
    orderBy: { enrolledAt: "desc" },
    take: 500,
  });
  return result(
    "info-matriculas",
    "Informações de matrículas",
    ctx.schoolName,
    ["Aluno", "Matrícula", "Turma", "Desde"],
    links.map((link) => [link.student.user.fullName, link.student.enrollmentCode, link.classGroup.name, formatDate(link.enrolledAt)]),
    "Nenhuma matrícula ativa neste filtro."
  );
}

async function enrollments(ctx: ExtraReportContext) {
  const applications = await prisma.enrollmentApplication.findMany({
    where: { schoolId: ctx.schoolId, ...(ctx.from || ctx.toEnd ? { createdAt: period(ctx.from, ctx.toEnd) } : {}) },
    select: { studentName: true, gradeLevel: true, status: true, createdAt: true, parentName: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return result(
    "matriculas",
    "Matrículas e rematrículas",
    ctx.schoolName,
    ["Aluno", "Curso pretendido", "Responsável", "Situação", "Data"],
    applications.map((item) => [item.studentName, item.gradeLevel, item.parentName, item.status, formatDate(item.createdAt)]),
    "Nenhum pedido de matrícula neste período."
  );
}

async function rooms(ctx: ExtraReportContext) {
  const slots = await prisma.classScheduleSlot.findMany({
    where: { schoolId: ctx.schoolId, ...(ctx.classId ? { classId: ctx.classId } : {}) },
    select: { weekday: true, startTime: true, endTime: true, subject: true, room: true, classGroup: { select: { name: true } } },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
  return result(
    "mapa-salas",
    "Mapa de salas",
    ctx.schoolName,
    ["Dia", "Horário", "Turma", "Disciplina", "Sala"],
    slots.map((slot) => [WEEKDAYS[slot.weekday] ?? String(slot.weekday), `${slot.startTime}–${slot.endTime}`, slot.classGroup.name, slot.subject, slot.room ?? "Sem sala"]),
    "A grade ainda não tem salas cadastradas."
  );
}

async function classChanges(ctx: ExtraReportContext) {
  const links = await prisma.studentClassEnrollment.findMany({
    where: {
      endedAt: { not: null },
      classGroup: { schoolId: ctx.schoolId },
      ...(ctx.classId ? { classId: ctx.classId } : {}),
      ...(ctx.from || ctx.toEnd ? { endedAt: period(ctx.from, ctx.toEnd) } : {}),
    },
    select: { endedAt: true, student: { select: { user: { select: { fullName: true } } } }, classGroup: { select: { name: true } } },
    orderBy: { endedAt: "desc" },
    take: 300,
  });
  return result(
    "mudancas-turma",
    "Mudanças de turmas",
    ctx.schoolName,
    ["Aluno", "Turma encerrada", "Encerrada em"],
    links.map((link) => [link.student.user.fullName, link.classGroup.name, link.endedAt ? formatDate(link.endedAt) : "—"]),
    "Nenhuma mudança de turma registrada."
  );
}

async function gradesBySubject(ctx: ExtraReportContext) {
  const grades = await loadGrades(ctx);
  const grouped = new Map<string, { subject: string; total: number; count: number; max: number; min: number }>();
  for (const grade of grades) {
    const current = grouped.get(grade.subject) ?? { subject: grade.subject, total: 0, count: 0, max: grade.value, min: grade.value };
    current.total += grade.value;
    current.count += 1;
    current.max = Math.max(current.max, grade.value);
    current.min = Math.min(current.min, grade.value);
    grouped.set(grade.subject, current);
  }
  return result(
    "notas-disciplina",
    "Notas por disciplina",
    ctx.schoolName,
    ["Disciplina", "Lançamentos", "Média", "Maior", "Menor"],
    [...grouped.values()].sort((a, b) => a.subject.localeCompare(b.subject, "pt-BR")).map((item) => [item.subject, String(item.count), (item.total / item.count).toFixed(1), item.max.toFixed(1), item.min.toFixed(1)]),
    "Nenhuma nota lançada neste filtro."
  );
}

async function occurrences(ctx: ExtraReportContext) {
  const items = await prisma.occurrence.findMany({
    where: {
      classGroup: { schoolId: ctx.schoolId },
      ...(ctx.classId ? { classId: ctx.classId } : {}),
      ...(ctx.studentId ? { studentId: ctx.studentId } : {}),
      ...(ctx.from || ctx.toEnd ? { date: period(ctx.from, ctx.toEnd) } : {}),
    },
    select: { date: true, kind: true, description: true, classGroup: { select: { name: true } }, student: { select: { user: { select: { fullName: true } } } }, teacher: { select: { fullName: true } } },
    orderBy: { date: "desc" },
    take: 300,
  });
  return result(
    "ocorrencias",
    "Ocorrências",
    ctx.schoolName,
    ["Data", "Turma", "Aluno", "Professor", "Tipo", "Descrição"],
    items.map((item) => [formatDate(item.date), item.classGroup.name, item.student?.user.fullName ?? "Turma", item.teacher.fullName, item.kind, item.description]),
    "Nenhuma ocorrência neste filtro."
  );
}

async function teachersByClass(ctx: ExtraReportContext) {
  const classes = await prisma.classGroup.findMany({
    where: { schoolId: ctx.schoolId, ...(ctx.classId ? { id: ctx.classId } : {}) },
    select: { name: true, teacher: { select: { fullName: true } }, coTeachers: { select: { teacher: { select: { fullName: true } } } } },
    orderBy: { name: "asc" },
  });
  return result(
    "professores-turma",
    "Professores por turma",
    ctx.schoolName,
    ["Turma", "Responsável", "Acompanha"],
    classes.map((item) => [item.name, item.teacher?.fullName ?? "—", item.coTeachers.map((teacher) => teacher.teacher.fullName).join(", ") || "—"]),
    "Nenhuma turma cadastrada."
  );
}

async function teachersPending(ctx: ExtraReportContext) {
  const classes = await prisma.classGroup.findMany({
    where: { schoolId: ctx.schoolId, teacherId: { not: null }, ...(ctx.classId ? { id: ctx.classId } : {}) },
    select: { id: true, name: true, teacher: { select: { fullName: true } }, students: { select: { id: true } } },
  });
  const studentIds = classes.flatMap((item) => item.students.map((student) => student.id));
  const graded = studentIds.length
    ? await prisma.grade.findMany({ where: { studentId: { in: studentIds } }, select: { studentId: true }, distinct: ["studentId"] })
    : [];
  const withGrade = new Set(graded.map((item) => item.studentId));
  const rows = classes
    .filter((item) => item.students.length === 0 || item.students.every((student) => !withGrade.has(student.id)))
    .map((item) => [item.name, item.teacher?.fullName ?? "—", String(item.students.length)]);
  return result("professores-pendentes", "Professores com lançamentos pendentes", ctx.schoolName, ["Turma", "Professor", "Alunos sem nota na turma"], rows, "Todas as turmas com professor já têm alguma nota lançada.");
}

async function documents(ctx: ExtraReportContext) {
  const view = ctx.view && ctx.view !== "todos" ? ctx.view : "";
  const docs = await prisma.issuedDocument.findMany({
    where: {
      schoolId: ctx.schoolId,
      ...(ctx.classId ? { classId: ctx.classId } : {}),
      ...(ctx.studentId ? { studentId: ctx.studentId } : {}),
      ...(view ? { OR: [{ type: { contains: view } }, { title: { contains: view } }] } : {}),
    },
    select: { title: true, type: true, status: true, issuedAt: true, student: { select: { user: { select: { fullName: true } } } } },
    orderBy: { issuedAt: "desc" },
    take: 300,
  });
  return result(
    "documentos",
    "Documentos emitidos",
    ctx.schoolName,
    ["Aluno", "Documento", "Tipo", "Situação", "Emitido em"],
    docs.map((doc) => [doc.student.user.fullName, doc.title, doc.type, doc.status, formatDate(doc.issuedAt)]),
    "Nenhum documento emitido neste filtro."
  );
}

async function stockItems(ctx: ExtraReportContext) {
  const term = ctx.name?.trim();
  const rewards = await prisma.reward.findMany({
    where: { schoolId: ctx.schoolId, ...(term ? { name: { contains: term } } : {}) },
    select: { name: true, coinCost: true, stock: true, isActive: true, category: { select: { name: true } }, _count: { select: { redemptions: true } } },
    orderBy: { name: "asc" },
  });
  return result(
    "estoque-itens",
    "Itens e kits",
    ctx.schoolName,
    ["Item", "Categoria", "Preço", "Estoque", "Resgates", "Status"],
    rewards.map((item) => [item.name, item.category?.name ?? "Sem categoria", `${item.coinCost} moedas`, item.stock === null ? "Ilimitado" : String(item.stock), String(item._count.redemptions), item.isActive ? "Ativo" : "Inativo"]),
    "Nenhum item na loja."
  );
}

async function stockExits(ctx: ExtraReportContext) {
  const items = await prisma.rewardRedemption.findMany({
    where: {
      reward: { schoolId: ctx.schoolId },
      ...(ctx.studentId ? { studentId: ctx.studentId } : {}),
      ...(ctx.from || ctx.toEnd ? { redeemedAt: period(ctx.from, ctx.toEnd) } : {}),
    },
    select: { redeemedAt: true, coinCost: true, status: true, reward: { select: { name: true } }, student: { select: { user: { select: { fullName: true } } } } },
    orderBy: { redeemedAt: "desc" },
    take: 300,
  });
  return result(
    "estoque-saidas",
    "Saídas",
    ctx.schoolName,
    ["Data", "Aluno", "Item", "Moedas", "Situação"],
    items.map((item) => [formatDate(item.redeemedAt), item.student.user.fullName, item.reward.name, String(item.coinCost), item.status]),
    "Nenhum resgate neste filtro."
  );
}

async function stockEntries(ctx: ExtraReportContext) {
  const rewards = await prisma.reward.findMany({
    where: { schoolId: ctx.schoolId, ...(ctx.from || ctx.toEnd ? { createdAt: period(ctx.from, ctx.toEnd) } : {}) },
    select: { name: true, createdAt: true, stock: true, category: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return result(
    "estoque-entradas",
    "Entradas",
    ctx.schoolName,
    ["Item", "Categoria", "Cadastrado em", "Estoque atual"],
    rewards.map((item) => [item.name, item.category?.name ?? "Sem categoria", formatDate(item.createdAt), item.stock === null ? "Ilimitado" : String(item.stock)]),
    "Nenhum item cadastrado neste período."
  );
}

async function chargesOf(ctx: ExtraReportContext) {
  const charges = await listBillingCharges(ctx.schoolId, ctx.studentId);
  if (!ctx.classId) return charges;
  const className = (await prisma.classGroup.findFirst({ where: { id: ctx.classId, schoolId: ctx.schoolId }, select: { name: true } }))?.name;
  return className ? charges.filter((charge) => charge.className === className) : charges;
}

function openCharges(charges: BillingCharge[]) {
  return charges.filter((charge) => charge.standing === "overdue" || charge.standing === "due" || charge.standing === "upcoming");
}

async function pendingByStudent(ctx: ExtraReportContext) {
  const charges = (await chargesOf(ctx)).filter((charge) => charge.standing === "overdue" || charge.standing === "due");
  const grouped = new Map<string, { name: string; className: string; count: number; cents: number }>();
  for (const charge of charges) {
    const current = grouped.get(charge.studentId) ?? { name: charge.studentName, className: charge.className ?? "Sem turma", count: 0, cents: 0 };
    current.count += 1;
    current.cents += charge.amountCents;
    grouped.set(charge.studentId, current);
  }
  return result(
    "parcelas-pendentes",
    "Alunos x parcelas pendentes",
    ctx.schoolName,
    ["Aluno", "Turma", "Parcelas", "Valor"],
    [...grouped.values()].sort((a, b) => b.cents - a.cents).map((item) => [item.name, item.className, String(item.count), formatBRL(item.cents)]),
    "Nenhuma parcela pendente."
  );
}

async function balance(ctx: ExtraReportContext) {
  const charges = await chargesOf(ctx);
  const groups = [
    ["Quitadas", charges.filter((charge) => charge.standing === "paid")],
    ["Pendentes", charges.filter((charge) => charge.standing === "overdue" || charge.standing === "due")],
    ["A vencer", charges.filter((charge) => charge.standing === "upcoming")],
  ] as const;
  return result(
    "balancete",
    "Balancete financeiro",
    ctx.schoolName,
    ["Situação", "Parcelas", "Valor"],
    groups.map(([label, items]) => [label, String(items.length), formatBRL(items.reduce((sum, item) => sum + item.amountCents, 0))]),
    "Nenhuma parcela lançada."
  );
}

async function balanceByStudent(ctx: ExtraReportContext) {
  const charges = await chargesOf(ctx);
  const grouped = new Map<string, { name: string; open: number; paid: number }>();
  for (const charge of charges) {
    const current = grouped.get(charge.studentId) ?? { name: charge.studentName, open: 0, paid: 0 };
    if (charge.standing === "paid") current.paid += charge.amountCents;
    else current.open += charge.amountCents;
    grouped.set(charge.studentId, current);
  }
  return result(
    "balancete-aluno",
    "Balancete financeiro por aluno",
    ctx.schoolName,
    ["Aluno", "Em aberto", "Quitado"],
    [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map((item) => [item.name, formatBRL(item.open), formatBRL(item.paid)]),
    "Nenhuma parcela neste filtro."
  );
}

async function receivable(ctx: ExtraReportContext) {
  const charges = openCharges(await chargesOf(ctx)).filter((charge) => charge.standing !== "paid");
  const grouped = new Map<string, { name: string; cents: number }>();
  for (const charge of charges) {
    const current = grouped.get(charge.studentId) ?? { name: charge.studentName, cents: 0 };
    current.cents += charge.amountCents;
    grouped.set(charge.studentId, current);
  }
  const rows = [...grouped.values()].sort((a, b) => b.cents - a.cents);
  const total = rows.reduce((sum, item) => sum + item.cents, 0);
  const lines = rows.map((item) => [item.name, formatBRL(item.cents)]);
  if (lines.length > 0) lines.push(["Total", formatBRL(total)]);
  return result(
    "contas-receber",
    "Contas a receber",
    ctx.schoolName,
    ["Aluno", "A receber"],
    lines,
    "Não há valores em aberto."
  );
}

async function cashflow(ctx: ExtraReportContext) {
  const charges = await chargesOf(ctx);
  const months = new Map<string, { open: number; paid: number }>();
  for (const charge of charges) {
    const date = new Date(charge.dueDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = months.get(key) ?? { open: 0, paid: 0 };
    if (charge.standing === "paid") current.paid += charge.amountCents;
    else current.open += charge.amountCents;
    months.set(key, current);
  }
  return result(
    "fluxo",
    "Fluxo e previsão",
    ctx.schoolName,
    ["Mês", "Quitado", "Em aberto"],
    [...months.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, item]) => [month, formatBRL(item.paid), formatBRL(item.open)]),
    "Nenhuma parcela para montar o fluxo."
  );
}

async function receipts(ctx: ExtraReportContext, logOnly: boolean) {
  const payments = await prisma.tuitionPayment.findMany({
    where: {
      student: { user: { schoolId: ctx.schoolId }, ...(ctx.studentId ? { id: ctx.studentId } : {}), ...classFilter(ctx.classId) },
      ...(ctx.from || ctx.toEnd ? { paidAt: period(ctx.from, ctx.toEnd) } : {}),
    },
    select: { receiptCode: true, amountCents: true, paidAt: true, method: true, student: { select: { user: { select: { fullName: true } } } } },
    orderBy: { paidAt: "desc" },
    take: 400,
  });
  return result(
    logOnly ? "log-recibos" : "recebimentos",
    logOnly ? "Log de recibos" : "Recebimentos",
    ctx.schoolName,
    ["Recibo", "Aluno", "Valor", "Forma", "Data"],
    payments.map((payment) => [payment.receiptCode, payment.student.user.fullName, formatBRL(payment.amountCents), payment.method, formatDate(payment.paidAt)]),
    "Nenhum recebimento neste filtro."
  );
}

async function byCategory(ctx: ExtraReportContext) {
  const charges = await chargesOf(ctx);
  const grouped = new Map<string, { count: number; cents: number }>();
  for (const charge of charges) {
    const current = grouped.get(charge.title) ?? { count: 0, cents: 0 };
    current.count += 1;
    current.cents += charge.amountCents;
    grouped.set(charge.title, current);
  }
  return result(
    "sintetico-categoria",
    "Sintético por categoria",
    ctx.schoolName,
    ["Categoria", "Parcelas", "Valor"],
    [...grouped.entries()].sort((a, b) => b[1].cents - a[1].cents).map(([title, item]) => [title, String(item.count), formatBRL(item.cents)]),
    "Nenhuma parcela neste filtro."
  );
}

async function byCourse(ctx: ExtraReportContext) {
  const classes = await prisma.classGroup.findMany({ where: { schoolId: ctx.schoolId }, select: { name: true, gradeLevel: true } });
  const courseOf = new Map(classes.map((item) => [item.name, item.gradeLevel]));
  const charges = await chargesOf(ctx);
  const grouped = new Map<string, { count: number; cents: number }>();
  for (const charge of charges) {
    const course = courseOf.get(charge.className ?? "") ?? "Sem curso";
    const current = grouped.get(course) ?? { count: 0, cents: 0 };
    current.count += 1;
    current.cents += charge.amountCents;
    grouped.set(course, current);
  }
  return result("valores-curso", "Valores por curso", ctx.schoolName, ["Curso", "Parcelas", "Valor"], [...grouped.entries()].map(([course, item]) => [course, String(item.count), formatBRL(item.cents)]), "Nenhuma parcela neste filtro.");
}

async function byClassAmount(ctx: ExtraReportContext) {
  const charges = await chargesOf(ctx);
  const grouped = new Map<string, { count: number; cents: number }>();
  for (const charge of charges) {
    const name = charge.className ?? "Sem turma";
    const current = grouped.get(name) ?? { count: 0, cents: 0 };
    current.count += 1;
    current.cents += charge.amountCents;
    grouped.set(name, current);
  }
  return result("valores-turma", "Valores por turma", ctx.schoolName, ["Turma", "Parcelas", "Valor"], [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR")).map(([name, item]) => [name, String(item.count), formatBRL(item.cents)]), "Nenhuma parcela neste filtro.");
}

async function averageTicket(ctx: ExtraReportContext) {
  const charges = await chargesOf(ctx);
  const grouped = new Map<string, { name: string; count: number; cents: number }>();
  for (const charge of charges) {
    const current = grouped.get(charge.studentId) ?? { name: charge.studentName, count: 0, cents: 0 };
    current.count += 1;
    current.cents += charge.amountCents;
    grouped.set(charge.studentId, current);
  }
  const rows = [...grouped.values()].filter((item) => item.count > 0);
  const average = rows.length ? rows.reduce((sum, item) => sum + item.cents / item.count, 0) / rows.length : 0;
  const lines = rows
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((item) => [item.name, String(item.count), formatBRL(Math.round(item.cents / item.count))]);
  if (lines.length > 0) lines.unshift(["Média da escola", String(rows.length), formatBRL(Math.round(average))]);
  return result(
    "ticket-medio",
    "Ticket médio do aluno",
    ctx.schoolName,
    ["Aluno", "Parcelas", "Média"],
    lines,
    "Nenhuma parcela para calcular a média."
  );
}

async function classSummary(ctx: ExtraReportContext) {
  const charges = await chargesOf(ctx);
  const grouped = new Map<string, { students: Set<string>; open: number; paid: number }>();
  for (const charge of charges) {
    const name = charge.className ?? "Sem turma";
    const current = grouped.get(name) ?? { students: new Set<string>(), open: 0, paid: 0 };
    current.students.add(charge.studentId);
    if (charge.standing === "paid") current.paid += 1;
    else current.open += 1;
    grouped.set(name, current);
  }
  return result(
    "sintetico-turma",
    "Sintético por turma",
    ctx.schoolName,
    ["Turma", "Alunos", "Parcelas em aberto", "Parcelas quitadas"],
    [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR")).map(([name, item]) => [name, String(item.students.size), String(item.open), String(item.paid)]),
    "Nenhuma turma com parcelas."
  );
}

async function announcements(ctx: ExtraReportContext) {
  const items = await prisma.announcement.findMany({
    where: { schoolId: ctx.schoolId, ...(ctx.classId ? { classId: ctx.classId } : {}), ...(ctx.from || ctx.toEnd ? { publishedAt: period(ctx.from, ctx.toEnd) } : {}) },
    select: { title: true, publishedAt: true, classGroup: { select: { name: true } }, author: { select: { fullName: true } } },
    orderBy: { publishedAt: "desc" },
    take: 200,
  });
  return result("comunicados", "Comunicados", ctx.schoolName, ["Data", "Título", "Turma", "Autor"], items.map((item) => [formatDate(item.publishedAt), item.title, item.classGroup?.name ?? "Escola", item.author.fullName]), "Nenhum comunicado neste filtro.");
}

async function staff(ctx: ExtraReportContext) {
  const term = ctx.name?.trim();
  const people = await prisma.user.findMany({
    where: { schoolId: ctx.schoolId, role: { in: ["admin", "director", "secretary", "teacher"] }, ...(term ? { fullName: { contains: term } } : {}) },
    select: { fullName: true, role: true, email: true, phone: true },
    orderBy: { fullName: "asc" },
  });
  const roleLabel: Record<string, string> = { admin: "Administração", director: "Direção", secretary: "Secretaria", teacher: "Professor" };
  return result("funcionarios", "Informações de funcionários", ctx.schoolName, ["Nome", "Função", "E-mail", "Celular"], people.map((person) => [person.fullName, roleLabel[person.role] ?? person.role, person.email, person.phone ?? "—"]), "Nenhum funcionário encontrado.");
}

async function accessLog(ctx: ExtraReportContext) {
  const term = ctx.name?.trim();
  const sessions = await prisma.session.findMany({
    where: { user: { schoolId: ctx.schoolId, ...(term ? { fullName: { contains: term } } : {}) }, ...(ctx.from || ctx.toEnd ? { createdAt: period(ctx.from, ctx.toEnd) } : {}) },
    select: { createdAt: true, expiresAt: true, user: { select: { fullName: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return result("log-acessos", "Log de acessos", ctx.schoolName, ["Entrada", "Pessoa", "Papel", "Expira"], sessions.map((item) => [formatDate(item.createdAt), item.user.fullName, item.user.role, formatDate(item.expiresAt)]), "Nenhum acesso neste filtro.");
}

async function auditLog(ctx: ExtraReportContext, deletions: boolean) {
  const items = await prisma.auditLog.findMany({
    where: {
      schoolId: ctx.schoolId,
      ...(deletions ? { action: { contains: "DELETE" } } : {}),
      ...(ctx.from || ctx.toEnd ? { createdAt: period(ctx.from, ctx.toEnd) } : {}),
    },
    select: { createdAt: true, action: true, entityType: true, actorRole: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return result(
    deletions ? "log-exclusao" : "log-auditoria",
    deletions ? "Log de exclusão" : "Log de trabalhos",
    ctx.schoolName,
    ["Data", "Ação", "Registro", "Papel"],
    items.map((item) => [formatDate(item.createdAt), item.action, item.entityType, item.actorRole]),
    deletions ? "Nenhuma exclusão registrada neste período." : "Nenhuma ação registrada neste período."
  );
}
