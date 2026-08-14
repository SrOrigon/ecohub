import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { teacherClassWhere, studentInTeacherClassWhere } from "@/lib/teacher-classes";

/**
 * Confirma que a turma pertence à escola do usuário e, para professores,
 * que ele leciona nela (titular ou co-docente).
 */
export async function assertClassInScope(
  user: SessionUser,
  classId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!user.schoolId) return { ok: false, error: "Escola não configurada." };
  if (!classId) return { ok: false, error: "Turma inválida." };

  const turma = await prisma.classGroup.findFirst({
    where: {
      id: classId,
      schoolId: user.schoolId,
      ...(user.role === "teacher" ? teacherClassWhere(user.id) : {}),
    },
    select: { id: true },
  });

  if (!turma) {
    return {
      ok: false,
      error: user.role === "teacher" ? "Sem permissão nesta turma." : "Turma não encontrada.",
    };
  }
  return { ok: true };
}

/**
 * Confirma que o aluno pertence à escola do usuário e, para professores,
 * que está em uma turma que ele leciona.
 */
export async function assertStudentInScope(
  user: SessionUser,
  studentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!user.schoolId) return { ok: false, error: "Escola não configurada." };
  if (!studentId) return { ok: false, error: "Aluno inválido." };

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      user: { schoolId: user.schoolId },
      ...(user.role === "teacher" ? studentInTeacherClassWhere(user.id) : {}),
    },
    select: { id: true },
  });

  if (!student) {
    return {
      ok: false,
      error: user.role === "teacher" ? "Sem acesso a este aluno." : "Aluno não encontrado.",
    };
  }
  return { ok: true };
}

/**
 * Autoriza leitura dos dados de um aluno conforme o papel de quem pede:
 * o próprio aluno, um responsável vinculado ou a equipe da mesma escola.
 */
export async function canReadStudentData(
  user: SessionUser,
  studentId: string
): Promise<boolean> {
  if (!studentId) return false;

  if (user.role === "student") {
    const own = await prisma.student.findFirst({
      where: { id: studentId, userId: user.id },
      select: { id: true },
    });
    return !!own;
  }

  if (user.role === "parent") {
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: user.id, studentId },
      select: { id: true },
    });
    return !!link;
  }

  const scope = await assertStudentInScope(user, studentId);
  return scope.ok;
}

/** Confirma que o professor informado pertence à escola do usuário. */
export async function assertTeachersInSchool(
  schoolId: string,
  teacherIds: string[]
): Promise<boolean> {
  const ids = teacherIds.filter(Boolean);
  if (ids.length === 0) return true;

  const count = await prisma.user.count({
    where: { id: { in: ids }, schoolId, role: { in: ["teacher", "director", "admin"] } },
  });
  return count === new Set(ids).size;
}
