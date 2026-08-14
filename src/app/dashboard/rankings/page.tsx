import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRankingsOverview } from "@/lib/rankings";
import { PageHeader } from "@/components/layout/page-header";
import { RankingsDashboard } from "@/components/rankings/rankings-dashboard";

const ALLOWED_ROLES = ["admin", "director", "secretary", "teacher", "student"] as const;

export default async function RankingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) redirect("/dashboard");

  const isStudent = user.role === "student";
  let currentStudentId: string | undefined;
  let defaultClassId: string | null = null;

  if (isStudent) {
    const student = await prisma.student.findFirst({
      where: { userId: user.id },
      select: { id: true, classId: true },
    });
    if (!student) redirect("/dashboard/aluno");
    currentStudentId = student.id;
    defaultClassId = student.classId;
  }

  const teacherId = user.role === "teacher" ? user.id : undefined;

  const data = await getRankingsOverview(user.schoolId, {
    teacherId,
    currentStudentId,
    anonymizePeers: isStudent,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rankings"
        description={
          isStudent
            ? "Competição saudável na turma e na escola  -  celebre seu progresso e o dos colegas"
            : "Rankings de turmas e alunos para engajamento, desempenho e competitividade saudável"
        }
      />

      <RankingsDashboard
        data={data}
        audience={isStudent ? "student" : "staff"}
        currentStudentId={currentStudentId}
        defaultClassId={defaultClassId}
      />
    </div>
  );
}
