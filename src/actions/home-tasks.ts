"use server";

import { revalidatePath } from "next/cache";
import { requireSessionResult } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { awardXp } from "@/lib/gamification";
import { hasPermission } from "@/lib/permissions";
import { getSchoolSettings } from "@/lib/school-settings";
import { HOME_TASK_DEFAULT_COINS, HOME_TASK_DEFAULT_XP } from "@/lib/constants";
import { notifyStudent, notifyUser } from "@/lib/notifications";
import { canReadStudentData } from "@/lib/tenant-guards";

function revalidateHomeTasks() {
  revalidatePath("/dashboard/responsavel");
  revalidatePath("/dashboard/aluno");
  ["/dashboard/responsavel/filho"].forEach((p) => revalidatePath(p, "layout"));
}

async function assertParentChild(parentId: string, studentId: string) {
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  if (!link) throw new Error("Filho não vinculado a este responsável.");
  return link;
}

export async function createHomeTaskAction(formData: FormData) {
  const session = await requireSessionResult(["parent"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;

  const studentId = String(formData.get("studentId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const dueDateStr = String(formData.get("dueDate") ?? "").trim();

  if (!studentId || !title) return { error: "Selecione o filho e informe a tarefa." };

  const settings = await getSchoolSettings(user.schoolId);
  if (!hasPermission(user.role, settings, "parent.viewChildData")) {
    return { error: "Sem permissão para gerenciar tarefas de casa." };
  }

  try {
    await assertParentChild(user.id, studentId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Vínculo inválido." };
  }

  const task = await prisma.homeTask.create({
    data: {
      studentId,
      parentId: user.id,
      title,
      description,
      xpReward: HOME_TASK_DEFAULT_XP,
      coinReward: HOME_TASK_DEFAULT_COINS,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
    },
  });

  await notifyStudent(
    studentId,
    "Nova tarefa de casa",
    `${user.fullName} definiu: "${title}" (+${HOME_TASK_DEFAULT_XP} XP)`,
    "/dashboard/aluno#tarefas-casa",
    "general"
  );

  revalidateHomeTasks();
  return { success: true, id: task.id };
}

export async function completeHomeTaskAction(formData: FormData) {
  const session = await requireSessionResult(["student"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;

  const taskId = String(formData.get("taskId") ?? "");

  const student = await prisma.student.findUnique({ where: { userId: user.id } });
  if (!student) return { error: "Perfil de aluno não encontrado." };

  const task = await prisma.homeTask.findFirst({
    where: { id: taskId, studentId: student.id, status: "pending" },
    include: { parent: { select: { fullName: true } } },
  });
  if (!task) return { error: "Tarefa não encontrada ou já concluída." };

  // updateMany condicional evita creditar XP duas vezes em cliques simultâneos.
  const claimed = await prisma.homeTask.updateMany({
    where: { id: taskId, studentId: student.id, status: "pending" },
    data: { status: "completed", completedAt: new Date() },
  });
  if (claimed.count === 0) return { error: "Tarefa já concluída." };

  await awardXp(
    student.id,
    task.xpReward,
    `Tarefa de casa: ${task.title}`,
    "homeTask",
    task.coinReward
  );

  await notifyUser(
    task.parentId,
    "Tarefa de casa concluída!",
    `${user.fullName} concluiu "${task.title}" (+${task.xpReward} XP)`,
    `/dashboard/responsavel/filho/${student.id}`
  );

  revalidateHomeTasks();
  return { success: true };
}

export async function deleteHomeTaskAction(formData: FormData) {
  const session = await requireSessionResult(["parent"]);
  if (!session.ok) return { error: session.error };
  const user = session.user;

  const taskId = String(formData.get("taskId") ?? "");

  const task = await prisma.homeTask.findFirst({
    where: { id: taskId, parentId: user.id, status: "pending" },
  });
  if (!task) return { error: "Tarefa não encontrada." };

  await prisma.homeTask.delete({ where: { id: taskId } });
  revalidateHomeTasks();
  return { success: true };
}

export async function getHomeTasksForStudent(studentId: string) {
  const session = await requireSessionResult();
  if (!session.ok) return [];
  if (!(await canReadStudentData(session.user, studentId))) return [];

  return prisma.homeTask.findMany({
    where: { studentId },
    include: { parent: { select: { fullName: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getPendingHomeTasksForStudent(studentId: string) {
  const session = await requireSessionResult();
  if (!session.ok) return [];
  if (!(await canReadStudentData(session.user, studentId))) return [];

  return prisma.homeTask.findMany({
    where: { studentId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getHomeTasksForParent(parentId: string) {
  const session = await requireSessionResult(["parent"]);
  if (!session.ok) return [];
  // Responsável só enxerga a própria lista.
  if (session.user.id !== parentId) return [];

  return prisma.homeTask.findMany({
    where: { parentId },
    include: {
      student: { include: { user: { select: { fullName: true } } } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
  });
}
