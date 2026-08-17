"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireSession, requireSessionResult } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processGradeXp, processAttendanceXp, completeMission } from "@/lib/gamification";
import { syncTrailAfterAction } from "@/lib/trails";
import { checkAndAwardClassGoals } from "@/lib/class-goals";
import {
  notifyStudent,
  notifyStudentParents,
  notifyClassTeacher,
  notifyUser,
} from "@/lib/notifications";
import { ATTENDANCE_LABELS, ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/constants";
import { parseDateOnlyOrToday } from "@/lib/date-only";
import { assertClassInScope, assertStudentInScope, assertTeachersInSchool } from "@/lib/tenant-guards";
import { assertInstitutionSubject, dedupeSubjects, normalizeSubjectName } from "@/lib/institution-subjects";
import {
  getSchoolSettings,
  mergeSchoolSettings,
  parseSchoolSettings,
  stringifySchoolSettings,
  type SchoolSettings,
} from "@/lib/school-settings";
import { hasPermission } from "@/lib/permissions";
import { validatePassword, hashPassword, normalizePassword, verifyPassword } from "@/lib/security/password-policy";
import { BCRYPT_ROUNDS } from "@/lib/security/constants";
import { parseBirthDate } from "@/lib/student-age";
import { resolveAvatarFromForm } from "@/lib/avatar";
import { teacherClassWhere } from "@/lib/teacher-classes";
import {
  generateStudentPin,
  hashStudentPin,
  syntheticStudentEmail,
} from "@/lib/student-pin";
import { confirmUserPersisted, persistGoldenBackupNow } from "@/lib/persistence-guard";
import { invalidateSchoolCaches } from "@/lib/runtime-cache";

function revalidatePaths(paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

const REVALIDATE = {
  core: ["/dashboard", "/dashboard/aluno", "/dashboard/professor", "/dashboard/secretaria", "/dashboard/responsavel"],
  people: ["/dashboard/alunos", "/dashboard/turmas", "/dashboard/professores", "/dashboard/responsaveis"],
  academic: ["/dashboard/notas", "/dashboard/frequencia", "/dashboard/boletim", "/dashboard/diario"],
  gamification: ["/dashboard/gamificacao", "/dashboard/rankings", "/dashboard/engajamento", "/dashboard/metas-coletivas"],
  analytics: [
    "/dashboard/leitura-geral",
    "/dashboard/historico",
    "/dashboard/aluno/historico",
    "/dashboard/precisao-disciplinas",
    "/dashboard/relatorios",
  ],
  exercises: ["/dashboard/exercicios"],
  alerts: ["/dashboard/alertas", "/dashboard/responsavel/alertas"],
  notifications: ["/dashboard/notificacoes"],
};

function revalidateGroups(...groups: (keyof typeof REVALIDATE)[]) {
  const seen = new Set<string>();
  for (const group of groups) {
    for (const path of REVALIDATE[group]) seen.add(path);
  }
  revalidatePaths([...seen]);
}

export async function createStudentAction(formData: FormData) {
  try {
    return await createStudentActionImpl(formData);
  } catch (error) {
    console.error("[crud] createStudentAction falhou:", error);
    return { error: "Não foi possível cadastrar o aluno. Verifique matrícula, e-mail e senha." };
  }
}

async function createStudentActionImpl(formData: FormData) {
  const session = await requireSessionResult(["admin", "director", "secretary", "teacher"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  if (!user.schoolId) return { error: "Escola não configurada." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  let email = String(formData.get("email") ?? "").trim().toLowerCase();
  const enrollmentCode = String(formData.get("enrollmentCode") ?? "").trim();
  const classId = String(formData.get("classId") ?? "") || null;
  const password = normalizePassword(String(formData.get("password") ?? ""));
  const birthDateStr = String(formData.get("birthDate") ?? "").trim();
  const accountMode = String(formData.get("accountMode") ?? "standard");
  const customPin = String(formData.get("pin") ?? "").trim();

  if (!fullName || !enrollmentCode || !birthDateStr) {
    return { error: "Nome, matrícula e data de nascimento são obrigatórios." };
  }

  const birthDate = parseBirthDate(birthDateStr);
  if (!birthDate) return { error: "Data de nascimento inválida." };

  if (classId) {
    const scope = await assertClassInScope(user, classId);
    if (!scope.ok) return { error: scope.error };
  }

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    select: { slug: true },
  });
  if (!school) return { error: "Escola não encontrada." };

  let pin: string | null = null;
  let accessPinHash: string | null = null;
  let accountType = "standard";

  if (accountMode === "pin_only") {
    accountType = "pin_only";
    pin = customPin || generateStudentPin();
    if (!/^\d{6}$/.test(pin)) {
      return { error: "PIN deve ter 6 dígitos numéricos." };
    }
    accessPinHash = await hashStudentPin(pin);
    email = syntheticStudentEmail(school.slug, enrollmentCode);
  } else if (!email) {
    return { error: "E-mail é obrigatório para conta com senha." };
  }

  let passwordHash: string;
  if (accountMode === "pin_only") {
    passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), BCRYPT_ROUNDS);
  } else {
    if (!password) return { error: "Senha inicial é obrigatória." };
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) return { error: passwordCheck.error };
    passwordHash = await hashPassword(password);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "E-mail já cadastrado." };

  const existingCode = await prisma.student.findUnique({ where: { enrollmentCode } });
  if (existingCode) return { error: "Matrícula já em uso." };

  let createdUser: { id: string };
  try {
    createdUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: "student",
        schoolId: user.schoolId,
        student: {
          create: {
            enrollmentCode,
            classId,
            birthDate,
            accessPinHash,
            accountType,
          },
        },
      },
    });
  } catch (error) {
    console.error("[crud] createStudentAction falhou:", error);
    return { error: "Não foi possível cadastrar o aluno. Verifique matrícula e e-mail." };
  }

  await confirmUserPersisted(
    (id) => prisma.user.findUnique({ where: { id }, select: { id: true } }),
    createdUser.id
  );

  if (accountMode !== "pin_only") {
    const stored = await prisma.user.findUnique({
      where: { id: createdUser.id },
      select: { passwordHash: true, email: true, role: true },
    });
    if (!stored || stored.role !== "student" || !(await verifyPassword(password, stored.passwordHash))) {
      console.error("[crud] login do aluno recém-criado não conferiu:", createdUser.id);
      return { error: "Aluno cadastrado, mas a senha não ficou utilizável. Redefina a senha ou cadastre novamente." };
    }
  }

  revalidateGroups("core", "people", "gamification", "analytics", "alerts");
  invalidateSchoolCaches(user.schoolId);
  return {
    success: true,
    pin: pin ?? undefined,
    enrollmentCode,
    accountType,
    email,
    loginPath: accountMode === "pin_only" ? "/entrar" : "/login/aluno",
  };
}

export async function createClassAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.createClasses")) {
    return { error: "Sem permissão para cadastrar turmas." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const gradeLevel = String(formData.get("gradeLevel") ?? "").trim();
  const year = parseInt(String(formData.get("year") ?? "2026"), 10);
  let teacherId = String(formData.get("teacherId") ?? "") || null;

  if (user.role === "teacher") {
    teacherId = user.id;
  }

  if (!name || !gradeLevel) return { error: "Nome e série são obrigatórios." };

  const coTeacherIds = formData
    .getAll("coTeacherIds")
    .map((v) => String(v))
    .filter(Boolean);

  const uniqueCoTeachers = [...new Set(coTeacherIds)].filter((id) => id !== teacherId);

  // Titular e co-docentes precisam pertencer à mesma escola.
  const staffOk = await assertTeachersInSchool(
    user.schoolId,
    [teacherId, ...uniqueCoTeachers].filter((id): id is string => !!id)
  );
  if (!staffOk) return { error: "Professor inválido para esta instituição." };

  const created = await prisma.classGroup.create({
    data: { schoolId: user.schoolId, name, gradeLevel, year, teacherId },
  });

  if (uniqueCoTeachers.length > 0) {
    await prisma.classGroupCoTeacher.createMany({
      data: uniqueCoTeachers.map((tid) => ({ classId: created.id, teacherId: tid })),
    });
  }

  revalidateGroups("core", "people", "exercises");
  revalidatePath("/dashboard/professor");
  revalidatePath("/dashboard/exercicios");
  invalidateSchoolCaches(user.schoolId);
  await persistGoldenBackupNow().catch((error) => {
    console.error("[crud] Backup após criar turma falhou (turma gravada):", error);
  });
  return { success: true };
}

export async function createGradeAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.createGrades")) {
    return { error: "Sem permissão para lançar notas." };
  }

  const studentId = String(formData.get("studentId") ?? "");
  const subject = String(formData.get("subject") ?? "");
  const value = parseFloat(String(formData.get("value") ?? "0"));
  const period = String(formData.get("period") ?? settings.academic.periods[0] ?? "1º Bimestre");
  const maxGrade = settings.academic.maxGrade;

  if (!studentId || !subject || isNaN(value)) {
    return { error: "Preencha todos os campos." };
  }

  const subjectCheck = assertInstitutionSubject(subject, settings.academic.subjects);
  if (!subjectCheck.ok) return { error: subjectCheck.error };

  if (value < 0 || value > maxGrade) {
    return { error: `Nota deve ser entre 0 e ${maxGrade}.` };
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: user.schoolId } },
  });
  if (!student) return { error: "Aluno não encontrado." };

  const { isPeriodClosed } = await import("@/lib/grade-formulas");
  if (isPeriodClosed(period, settings)) {
    return { error: `O período "${period}" está fechado. Reabra nas configurações ou contate o diretor.` };
  }

  await prisma.grade.create({
    data: {
      studentId,
      subject,
      value,
      period,
      teacherId: user.role === "teacher" ? user.id : undefined,
    },
  });

  await processGradeXp(studentId, value, subject);

  await notifyStudent(
    studentId,
    "Nova nota lançada",
    `${subject}: ${value.toFixed(1)} (${period})`,
    "/dashboard/aluno"
  );
  await notifyStudentParents(
    studentId,
    "Nota do filho(a)",
    `${subject}: ${value.toFixed(1)} (${period})`,
    `/dashboard/responsavel/filho/${studentId}`,
    "grade"
  );

  revalidateGroups("core", "academic", "gamification", "analytics", "alerts");
  return { success: true };
}

export async function updateGradeAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.createGrades")) {
    return { error: "Sem permissão para editar notas." };
  }

  const gradeId = String(formData.get("gradeId") ?? "");
  const value = parseFloat(String(formData.get("value") ?? "0"));
  const maxGrade = settings.academic.maxGrade;

  if (!gradeId || isNaN(value)) return { error: "Dados inválidos." };
  if (value < 0 || value > maxGrade) return { error: `Nota deve ser entre 0 e ${maxGrade}.` };

  const grade = await prisma.grade.findFirst({
    where: { id: gradeId, student: { user: { schoolId: user.schoolId } } },
    include: { student: true },
  });
  if (!grade) return { error: "Nota não encontrada." };

  const { isPeriodClosed } = await import("@/lib/grade-formulas");
  if (isPeriodClosed(grade.period, settings)) {
    return { error: `O período "${grade.period}" está fechado para edição.` };
  }

  await prisma.grade.update({ where: { id: gradeId }, data: { value } });

  await notifyStudent(
    grade.studentId,
    "Nota atualizada",
    `${grade.subject}: ${value.toFixed(1)} (${grade.period})`,
    "/dashboard/aluno"
  );
  await notifyStudentParents(
    grade.studentId,
    "Nota atualizada",
    `${grade.subject}: ${value.toFixed(1)} (${grade.period})`,
    `/dashboard/responsavel/filho/${grade.studentId}`,
    "grade"
  );

  revalidateGroups("core", "academic", "gamification", "analytics", "alerts");
  return { success: true };
}

export async function deleteGradeAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.createGrades")) {
    return { error: "Sem permissão para excluir notas." };
  }

  const gradeId = String(formData.get("gradeId") ?? "");
  const grade = await prisma.grade.findFirst({
    where: { id: gradeId, student: { user: { schoolId: user.schoolId } } },
  });
  if (!grade) return { error: "Nota não encontrada." };

  const { isPeriodClosed } = await import("@/lib/grade-formulas");
  if (isPeriodClosed(grade.period, settings)) {
    return { error: `O período "${grade.period}" está fechado para exclusão.` };
  }

  await prisma.grade.delete({ where: { id: gradeId } });
  revalidateGroups("core", "academic", "gamification", "analytics", "alerts");
  return { success: true };
}

export async function updateClassCoTeachersAction(formData: FormData) {
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const classId = String(formData.get("classId") ?? "");
  const coTeacherIds = formData
    .getAll("coTeacherIds")
    .map((v) => String(v))
    .filter(Boolean);

  const turma = await prisma.classGroup.findFirst({
    where: { id: classId, schoolId: user.schoolId },
  });
  if (!turma) return { error: "Turma não encontrada." };

  const unique = [...new Set(coTeacherIds)].filter((id) => id !== turma.teacherId);

  const staffOk = await assertTeachersInSchool(user.schoolId, unique);
  if (!staffOk) return { error: "Professor inválido para esta instituição." };

  await prisma.classGroupCoTeacher.deleteMany({ where: { classId } });
  if (unique.length > 0) {
    await prisma.classGroupCoTeacher.createMany({
      data: unique.map((teacherId) => ({ classId, teacherId })),
    });
  }

  revalidateGroups("core", "people");
  revalidatePath("/dashboard/turmas");
  revalidatePath("/dashboard/professor");
  return { success: true };
}

export async function bulkCompleteMissionsAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.completeMissions")) {
    return { error: "Sem permissão para concluir missões." };
  }

  const items = formData.getAll("items").map(String).filter(Boolean);
  if (items.length === 0) return { error: "Selecione ao menos uma missão." };

  let completed = 0;
  const errors: string[] = [];

  for (const item of items) {
    const [studentId, missionId] = item.split(":");
    if (!studentId || !missionId) continue;

    try {
      const student = await prisma.student.findFirst({
        where: { id: studentId, user: { schoolId: user.schoolId } },
      });
      if (!student) {
        errors.push("Aluno não encontrado.");
        continue;
      }

      if (user.role === "teacher") {
        const allowed = await prisma.student.findFirst({
          where: {
            id: studentId,
            user: { schoolId: user.schoolId },
            classGroup: teacherClassWhere(user.id),
          },
        });
        if (!allowed) {
          errors.push("Sem acesso a um dos alunos.");
          continue;
        }
      }

      const mission = await prisma.mission.findFirst({
        where: { id: missionId, schoolId: user.schoolId, isActive: true },
      });
      if (!mission) {
        errors.push("Missão não encontrada.");
        continue;
      }

      await completeMission(studentId, missionId);
      await notifyStudent(
        studentId,
        "Missão concluída!",
        `Você ganhou ${mission.xpReward} XP e ${mission.coinReward} moedas em "${mission.title}".`,
        "/dashboard/aluno"
      );
      await notifyStudentParents(
        studentId,
        "Missão concluída",
        `Missão "${mission.title}" foi concluída.`,
        `/dashboard/responsavel/filho/${studentId}`,
        "mission"
      );
      await syncTrailAfterAction(studentId, "mission", missionId);
      if (student.classId) await checkAndAwardClassGoals(student.classId);
      completed++;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Erro ao concluir missão.");
    }
  }

  revalidateGroups("core", "gamification", "analytics", "alerts");
  revalidatePath("/dashboard/gamificacao");
  revalidatePath("/dashboard/professor");

  if (completed === 0) {
    return { error: errors[0] ?? "Nenhuma missão foi concluída." };
  }

  return { success: true, completed, errors: errors.length > 0 ? errors : undefined };
}

export async function recordAttendanceAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const studentId = String(formData.get("studentId") ?? "");
  const classId = String(formData.get("classId") ?? "");
  const status = String(formData.get("status") ?? "present");
  const date = parseDateOnlyOrToday(formData.get("date")?.toString());

  if (!studentId || !classId) return { error: "Aluno e turma são obrigatórios." };
  if (!ATTENDANCE_STATUSES.includes(status as AttendanceStatus)) {
    return { error: "Situação de frequência inválida." };
  }

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.recordAttendance")) {
    return { error: "Sem permissão para registrar frequência." };
  }

  const scope = await assertClassInScope(user, classId);
  if (!scope.ok) return { error: scope.error };

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      classId,
      user: { schoolId: user.schoolId },
    },
  });
  if (!student) return { error: "Aluno não encontrado nesta turma." };

  const existing = await prisma.attendance.findUnique({
    where: { studentId_date: { studentId, date } },
  });

  const previousStatus = existing?.status ?? null;
  if (existing) {
    await prisma.attendance.update({
      where: { id: existing.id },
      data: { status },
    });
  } else {
    await prisma.attendance.create({
      data: { studentId, classId, date, status },
    });
  }

  if (previousStatus !== status) {
    await processAttendanceXp(studentId, status, previousStatus);
  }

  if (
    (status === "absent" || status === "late") &&
    previousStatus !== status
  ) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: { select: { fullName: true } } },
    });
    const label = ATTENDANCE_LABELS[status as AttendanceStatus] ?? status;
    const when = date.toLocaleDateString("pt-BR");
    if (student) {
      await notifyStudentParents(
        studentId,
        status === "absent" ? "Falta registrada" : "Atraso registrado",
        `${student.user.fullName}: ${label} em ${when}`,
        `/dashboard/responsavel/filho/${studentId}`,
        "absence"
      );
      if (status === "absent") {
        await notifyStudent(
          studentId,
          "Falta registrada",
          `Falta em ${when}. Fale com a secretaria se houver justificativa.`,
          "/dashboard/aluno",
          "absence"
        );
      }
    }
  }

  revalidateGroups("core", "academic", "gamification", "analytics", "alerts");
  return { success: true };
}

export async function createMissionAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const settings = await getSchoolSettings(user.schoolId);
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const xpReward = parseInt(
    String(formData.get("xpReward") ?? String(settings.missions.defaultXp)),
    10
  );
  const coinReward = parseInt(
    String(formData.get("coinReward") ?? String(settings.missions.defaultCoins)),
    10
  );
  const classId = String(formData.get("classId") ?? "") || null;
  const dueDateStr = String(formData.get("dueDate") ?? "");

  if (!title) return { error: "Título é obrigatório." };

  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.createMissions")) {
    return { error: "Sem permissão para criar missões." };
  }

  const mission = await prisma.mission.create({
    data: {
      schoolId: user.schoolId,
      title,
      description,
      xpReward,
      coinReward,
      classId,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      isActive: true,
    },
  });

  if (classId) {
    const classStudents = await prisma.student.findMany({
      where: { classId },
      select: { id: true },
    });
    for (const s of classStudents) {
      await notifyStudent(
        s.id,
        "Nova missão disponível",
        mission.title,
        "/dashboard/aluno"
      );
    }
  }

  revalidateGroups("core", "gamification", "analytics", "notifications");
  return { success: true };
}

export async function updateMissionAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const missionId = String(formData.get("missionId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const xpReward = parseInt(String(formData.get("xpReward") ?? "100"), 10);
  const coinReward = parseInt(String(formData.get("coinReward") ?? "30"), 10);
  const classId = String(formData.get("classId") ?? "") || null;
  const dueDateStr = String(formData.get("dueDate") ?? "");

  if (!missionId || !title) return { error: "Dados inválidos." };

  const mission = await prisma.mission.findFirst({
    where: { id: missionId, schoolId: user.schoolId },
  });
  if (!mission) return { error: "Missão não encontrada." };

  await prisma.mission.update({
    where: { id: missionId },
    data: {
      title,
      description: description || null,
      xpReward,
      coinReward,
      classId,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
    },
  });

  revalidateGroups("gamification", "analytics");
  return { success: true };
}

export async function toggleMissionAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };
  const missionId = String(formData.get("missionId") ?? "");

  const mission = await prisma.mission.findFirst({
    where: { id: missionId, schoolId: user.schoolId },
  });
  if (!mission) return { error: "Missão não encontrada." };

  await prisma.mission.update({
    where: { id: missionId },
    data: { isActive: !mission.isActive },
  });

  revalidateGroups("gamification", "analytics");
  return { success: true };
}

export async function completeMissionAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };
  const studentId = String(formData.get("studentId") ?? "");
  const missionId = String(formData.get("missionId") ?? "");

  if (!studentId || !missionId) return { error: "Dados inválidos." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.completeMissions")) {
    return { error: "Sem permissão para concluir missões." };
  }

  const scope = await assertStudentInScope(user, studentId);
  if (!scope.ok) return { error: scope.error };

  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: user.schoolId } },
  });
  if (!student) return { error: "Aluno não encontrado." };

  try {
    const mission = await prisma.mission.findFirst({
      where: { id: missionId, schoolId: user.schoolId },
    });
    if (!mission) return { error: "Missão não encontrada." };
    await completeMission(studentId, missionId);

    if (mission) {
      await notifyStudent(
        studentId,
        "Missão concluída!",
        `Você ganhou ${mission.xpReward} XP e ${mission.coinReward} moedas em "${mission.title}".`,
        "/dashboard/aluno"
      );
      await notifyStudentParents(
        studentId,
        "Missão concluída",
        `Missão "${mission.title}" foi concluída.`,
        `/dashboard/responsavel/filho/${studentId}`,
        "mission"
      );
    }

    await syncTrailAfterAction(studentId, "mission", missionId);
    if (student.classId) await checkAndAwardClassGoals(student.classId);

    revalidateGroups("core", "gamification", "analytics", "alerts");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao concluir missão." };
  }
}

export async function bulkAttendanceAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const classId = String(formData.get("classId") ?? "");
  const date = parseDateOnlyOrToday(formData.get("date")?.toString());

  if (!classId) return { error: "Selecione uma turma." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.recordAttendance")) {
    return { error: "Sem permissão para registrar frequência." };
  }

  const scope = await assertClassInScope(user, classId);
  if (!scope.ok) return { error: scope.error };

  const students = await prisma.student.findMany({
    where: { classId, user: { schoolId: user.schoolId } },
    include: { user: { select: { fullName: true } } },
  });

  if (students.length === 0) return { error: "Nenhum aluno nesta turma." };

  // Uma única leitura dos registros do dia evita N+1 em turmas grandes.
  const existingRows = await prisma.attendance.findMany({
    where: { date, studentId: { in: students.map((s) => s.id) } },
    select: { id: true, studentId: true, status: true },
  });
  const existingByStudent = new Map(existingRows.map((row) => [row.studentId, row]));

  const when = date.toLocaleDateString("pt-BR");
  const toCreate: { studentId: string; classId: string; date: Date; status: string }[] = [];
  const changed: { studentId: string; fullName: string; status: string; previous: string | null }[] = [];

  for (const student of students) {
    const raw = String(formData.get(`status_${student.id}`) ?? "present");
    const status = ATTENDANCE_STATUSES.includes(raw as AttendanceStatus) ? raw : "present";
    const existing = existingByStudent.get(student.id);
    const previousStatus = existing?.status ?? null;

    if (existing) {
      if (existing.status !== status) {
        await prisma.attendance.update({ where: { id: existing.id }, data: { status } });
      }
    } else {
      toCreate.push({ studentId: student.id, classId, date, status });
    }

    if (previousStatus !== status) {
      changed.push({
        studentId: student.id,
        fullName: student.user.fullName,
        status,
        previous: previousStatus,
      });
    }
  }

  if (toCreate.length > 0) {
    await prisma.attendance.createMany({ data: toCreate });
  }
  const registered = toCreate.length;

  for (const item of changed) {
    await processAttendanceXp(item.studentId, item.status, item.previous);

    if (item.status === "absent" || item.status === "late") {
      const label = ATTENDANCE_LABELS[item.status as AttendanceStatus] ?? item.status;
      await notifyStudentParents(
        item.studentId,
        item.status === "absent" ? "Falta registrada" : "Atraso registrado",
        `${item.fullName}: ${label} em ${when}`,
        `/dashboard/responsavel/filho/${item.studentId}`,
        "absence"
      );
    }
  }

  await checkAndAwardClassGoals(classId);

  revalidateGroups("core", "academic", "gamification", "analytics", "alerts");
  return { success: true, message: `Chamada registrada para ${students.length} alunos (${registered} novos).` };
}

export async function requestMissionCompletionAction(formData: FormData) {
  const session = await requireSessionResult(["student"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  const missionId = String(formData.get("missionId") ?? "");
  if (!missionId) return { error: "Missão inválida." };

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: { classGroup: { select: { teacherId: true, name: true } } },
  });
  if (!student) return { error: "Perfil de aluno não encontrado." };

  const settings = await getSchoolSettings(user.schoolId);
  if (!hasPermission(user.role, settings, "student.requestMission")) {
    return { error: "Pedido de confirmação de missão desativado." };
  }

  if (!user.schoolId) return { error: "Escola não configurada." };

  const mission = await prisma.mission.findFirst({
    where: {
      id: missionId,
      schoolId: user.schoolId,
      isActive: true,
      OR: [{ classId: null }, { classId: student.classId }],
    },
  });
  if (!mission) return { error: "Missão não encontrada." };

  const existing = await prisma.studentMission.findUnique({
    where: { studentId_missionId: { studentId: student.id, missionId } },
  });
  if (existing?.completedAt) {
    return { error: "Esta missão já foi concluída." };
  }

  if (!existing) {
    await prisma.studentMission.create({
      data: { studentId: student.id, missionId },
    });
  }

  const href = "/dashboard/gamificacao";
  const msg = `${user.fullName} pediu confirmação da missão "${mission.title}".`;

  if (student.classGroup?.teacherId) {
    await notifyUser(student.classGroup.teacherId, "Confirmar missão", msg, href);
  } else {
    await notifyClassTeacher(student.classId, "Confirmar missão", msg, href);
  }

  revalidateGroups("gamification");
  revalidatePath("/dashboard/gamificacao");
  return { success: true };
}

export async function updateStudentAction(formData: FormData) {
  const user = await requireSession(["admin", "director", "secretary", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const studentId = String(formData.get("studentId") ?? "");
  const classId = String(formData.get("classId") ?? "") || null;

  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: user.schoolId } },
  });
  if (!student) return { error: "Aluno não encontrado." };

  if (classId) {
    const scope = await assertClassInScope(user, classId);
    if (!scope.ok) return { error: scope.error };
  }

  await prisma.student.update({ where: { id: studentId }, data: { classId } });
  revalidateGroups("core", "people", "gamification", "analytics");
  revalidatePath("/dashboard/alunos");
  revalidatePath(`/dashboard/alunos/${studentId}`);
  return { success: true };
}

export async function createTeacherAction(formData: FormData) {
  try {
    return await createTeacherActionImpl(formData);
  } catch (error) {
    console.error("[crud] createTeacherAction falhou:", error);
    return { error: "Não foi possível cadastrar o professor. Verifique o e-mail e a senha." };
  }
}

async function createTeacherActionImpl(formData: FormData) {
  const session = await requireSessionResult(["admin", "director"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;
  if (!user.schoolId) return { error: "Escola não configurada." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = normalizePassword(String(formData.get("password") ?? ""));
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim().toUpperCase();

  if (!fullName || !email || !password) return { error: "Nome, e-mail e senha são obrigatórios." };

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) return { error: passwordCheck.error };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "E-mail já cadastrado." };

  const avatarResult = await resolveAvatarFromForm(formData, null);
  if (avatarResult && typeof avatarResult === "object" && "error" in avatarResult) {
    return { error: avatarResult.error };
  }

  const passwordHash = await hashPassword(password);
  let createdTeacher: { id: string };
  try {
    createdTeacher = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: "teacher",
        schoolId: user.schoolId,
        avatarUrl: avatarResult as string | null,
        city: city || null,
        state: state || null,
      },
    });
  } catch (error) {
    console.error("[crud] createTeacherAction falhou:", error);
    return { error: "Não foi possível cadastrar o professor. Verifique o e-mail informado." };
  }

  await confirmUserPersisted(
    (id) => prisma.user.findUnique({ where: { id }, select: { id: true } }),
    createdTeacher.id
  );

  const stored = await prisma.user.findUnique({
    where: { id: createdTeacher.id },
    select: { passwordHash: true, role: true },
  });
  if (!stored || stored.role !== "teacher" || !(await verifyPassword(password, stored.passwordHash))) {
    console.error("[crud] login do professor recém-criado não conferiu:", createdTeacher.id);
    return { error: "Professor cadastrado, mas a senha não ficou utilizável. Redefina a senha ou cadastre novamente." };
  }

  revalidatePath("/dashboard/professores");
  invalidateSchoolCaches(user.schoolId);
  return { success: true, email, loginPath: "/login/professor" };
}

export async function deleteStudentAction(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  const user = await requireSession(["admin", "director", "secretary"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { schoolId: user.schoolId } },
    include: { user: true },
  });
  if (!student) return { error: "Aluno não encontrado." };

  await prisma.user.delete({ where: { id: student.userId } });
  revalidateGroups("core", "people", "academic", "gamification", "analytics", "alerts", "exercises");
  invalidateSchoolCaches(user.schoolId);
  return { success: true };
}

export async function deleteTeacherAction(formData: FormData) {
  const teacherId = String(formData.get("teacherId") ?? "");
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return { error: "Escola não configurada." };
  if (!teacherId) return { error: "Professor inválido." };
  if (teacherId === user.id) {
    return { error: "Use Configurações → Perfil para encerrar sua própria conta." };
  }

  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, schoolId: user.schoolId, role: "teacher" },
  });
  if (!teacher) return { error: "Professor não encontrado." };

  await prisma.$transaction(async (tx) => {
    await tx.classGroup.updateMany({ where: { teacherId }, data: { teacherId: null } });
    await tx.classGroupCoTeacher.deleteMany({ where: { teacherId } });
    await tx.user.delete({ where: { id: teacherId } });
  });

  revalidatePath("/dashboard/professores");
  revalidatePath("/dashboard/turmas");
  revalidatePath("/dashboard/exercicios");
  revalidatePath("/dashboard/diario");
  invalidateSchoolCaches(user.schoolId);
  return { success: true };
}

export async function deleteClassAction(formData: FormData) {
  const classId = String(formData.get("classId") ?? "");
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return { error: "Escola não configurada." };
  if (!classId) return { error: "Turma inválida." };

  const turma = await prisma.classGroup.findFirst({
    where: { id: classId, schoolId: user.schoolId },
    select: { id: true, name: true },
  });
  if (!turma) return { error: "Turma não encontrada." };

  await prisma.classGroup.delete({ where: { id: classId } });

  revalidateGroups("core", "people", "exercises", "academic", "gamification", "analytics");
  revalidatePath("/dashboard/turmas");
  revalidatePath("/dashboard/alunos");
  revalidatePath("/dashboard/professor");
  return { success: true };
}

export async function deleteMissionAction(formData: FormData) {
  const missionId = String(formData.get("missionId") ?? "");
  const user = await requireSession(["admin", "director", "teacher"]);
  if (!user.schoolId) return { error: "Escola não configurada." };
  if (!missionId) return { error: "Missão inválida." };

  const settings = await getSchoolSettings(user.schoolId);
  if (user.role === "teacher" && !hasPermission(user.role, settings, "teacher.createMissions")) {
    return { error: "Sem permissão para excluir missões." };
  }

  const mission = await prisma.mission.findFirst({
    where: { id: missionId, schoolId: user.schoolId },
  });
  if (!mission) return { error: "Missão não encontrada." };

  if (mission.classId && user.role === "teacher") {
    const scope = await assertClassInScope(user, mission.classId);
    if (!scope.ok) return { error: scope.error };
  }

  await prisma.mission.delete({ where: { id: missionId } });

  revalidateGroups("gamification", "analytics");
  revalidatePath("/dashboard/gamificacao");
  return { success: true };
}

export async function updateSchoolAction(formData: FormData) {
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();

  if (!name) return { error: "Nome da escola é obrigatório." };

  await prisma.school.update({
    where: { id: user.schoolId },
    data: { name, city, state },
  });

  revalidatePath("/dashboard/configuracoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateSchoolSettingsAction(formData: FormData) {
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const currentSettings = await getSchoolSettings(user.schoolId);
  if (user.role === "director" && !hasPermission(user.role, currentSettings, "director.editSettings")) {
    return { error: "Sem permissão para editar configurações." };
  }

  const raw = String(formData.get("settingsJson") ?? "");
  if (!raw) return { error: "Configurações inválidas." };

  let patch: Partial<SchoolSettings>;
  try {
    patch = JSON.parse(raw) as Partial<SchoolSettings>;
  } catch {
    return { error: "JSON de configurações inválido." };
  }

  const school = await prisma.school.findUnique({ where: { id: user.schoolId } });
  if (!school) return { error: "Escola não encontrada." };

  const current = parseSchoolSettings(school.settings);
  const merged = mergeSchoolSettings(current, patch);

  if (merged.academic.periods.length === 0) {
    return { error: "Informe ao menos um período." };
  }
  if (merged.xp.xpPerLevel < 50) {
    return { error: "XP por nível deve ser no mínimo 50." };
  }
  if (merged.academic.maxGrade <= 0) {
    return { error: "Nota máxima inválida." };
  }

  await prisma.school.update({
    where: { id: user.schoolId },
    data: { settings: stringifySchoolSettings(merged) },
  });
  invalidateSchoolCaches(user.schoolId, school.slug);

  [
    "/dashboard/configuracoes",
    "/dashboard/disciplinas",
    "/dashboard/notas",
    "/dashboard/gamificacao",
    "/dashboard/exercicios",
    "/dashboard/aluno",
    "/dashboard/professor",
    "/dashboard/loja",
    "/dashboard/calendario",
    "/dashboard/horarios",
    "/dashboard/diario",
    "/dashboard/alunos",
    "/dashboard/turmas",
    "/dashboard/precisao-disciplinas",
    "/dashboard/leitura-geral",
    "/dashboard/relatorios",
  ].forEach((p) => revalidatePath(p));

  return { success: true };
}

export async function updateInstitutionSubjectsAction(formData: FormData) {
  const user = await requireSession(["admin", "director"]);
  if (!user.schoolId) return { error: "Escola não configurada." };

  const currentSettings = await getSchoolSettings(user.schoolId);
  if (user.role === "director" && !hasPermission(user.role, currentSettings, "director.editSettings")) {
    return { error: "Sem permissão para editar disciplinas." };
  }

  const raw = String(formData.get("subjectsJson") ?? "");
  if (!raw) return { error: "Lista de disciplinas inválida." };

  let subjects: string[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return { error: "Lista de disciplinas inválida." };
    subjects = dedupeSubjects(parsed.map((item) => normalizeSubjectName(String(item ?? ""))));
  } catch {
    return { error: "Lista de disciplinas inválida." };
  }

  if (subjects.length === 0) {
    return { error: "Cadastre ao menos uma disciplina." };
  }

  const school = await prisma.school.findUnique({ where: { id: user.schoolId } });
  if (!school) return { error: "Escola não encontrada." };

  const current = parseSchoolSettings(school.settings);
  const merged = mergeSchoolSettings(current, {
    academic: { ...current.academic, subjects },
  });

  await prisma.school.update({
    where: { id: user.schoolId },
    data: { settings: stringifySchoolSettings(merged) },
  });
  invalidateSchoolCaches(user.schoolId, school.slug);

  [
    "/dashboard/disciplinas",
    "/dashboard/configuracoes",
    "/dashboard/notas",
    "/dashboard/horarios",
    "/dashboard/diario",
    "/dashboard/exercicios",
    "/dashboard/professor",
    "/dashboard/alunos",
    "/dashboard/precisao-disciplinas",
    "/dashboard/leitura-geral",
    "/dashboard/relatorios",
  ].forEach((p) => revalidatePath(p));

  return { success: true };
}
