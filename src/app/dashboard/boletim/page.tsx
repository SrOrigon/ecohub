import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function MeuBoletimPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (user.role === "student") {
    const student = await prisma.student.findFirst({ where: { userId: user.id } });
    if (student) redirect(`/dashboard/alunos/${student.id}/boletim`);
    redirect("/dashboard/aluno");
  }

  redirect("/dashboard");
}
