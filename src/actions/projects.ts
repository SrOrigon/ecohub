"use server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getProjects(schoolId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Não autorizado");

  const projects = await prisma.studentProject.findMany({
    where: { schoolId },
    include: {
      student: {
        include: {
          user: true,
          classGroup: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return projects;
}

export async function createProject(data: {
  title: string;
  description?: string | null;
  projectUrl?: string | null;
  imageUrl?: string | null;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "student") {
    throw new Error("Somente alunos podem enviar projetos");
  }

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
  });

  if (!student) {
    throw new Error("Aluno não encontrado");
  }

  const project = await prisma.studentProject.create({
    data: {
      schoolId: user.schoolId || "",
      studentId: student.id,
      title: data.title,
      description: data.description,
      projectUrl: data.projectUrl,
      imageUrl: data.imageUrl,
    },
  });

  revalidatePath("/dashboard/projetos");
  revalidatePath("/dashboard/aluno");

  return { success: true, project };
}
