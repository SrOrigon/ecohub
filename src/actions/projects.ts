"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function isValidHttpUrl(string: string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

export async function createProject(data: {
  title: string;
  description?: string;
  projectUrl?: string;
  imageUrl?: string;
}) {
  const user = await getSessionUser();

  if (!user || user.role !== "student") {
    throw new Error("Apenas alunos podem enviar projetos.");
  }

  // Validate URLs to prevent XSS
  if (data.projectUrl && !isValidHttpUrl(data.projectUrl)) {
    throw new Error("A URL do projeto deve iniciar com http:// ou https://");
  }

  if (data.imageUrl && !isValidHttpUrl(data.imageUrl)) {
    throw new Error("A URL da imagem deve iniciar com http:// ou https://");
  }

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
  });

  if (!student) {
    throw new Error("Estudante não encontrado.");
  }

  const project = await prisma.studentProject.create({
    data: {
      title: data.title,
      description: data.description,
      projectUrl: data.projectUrl,
      imageUrl: data.imageUrl,
      studentId: student.id,
      schoolId: user.schoolId!,
    },
  });

  revalidatePath("/dashboard/projetos");
  return project;
}

export async function getProjects() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) return [];

  const projects = await prisma.studentProject.findMany({
    where: { schoolId: user.schoolId },
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
