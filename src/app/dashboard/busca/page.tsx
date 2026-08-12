import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchParentChildren } from "@/lib/reads/parent-reads";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { UserIdentity } from "@/components/profile/user-identity";
import { Search } from "lucide-react";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.schoolId) redirect("/dashboard");

  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();

  if (!query) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Busca"
          description={
            user.role === "parent"
              ? "Encontre informações sobre seus filhos vinculados."
              : user.role === "student"
                ? "Consulte suas notas e missões."
                : "Digite um termo na barra de busca do topo para encontrar alunos, turmas ou missões."
          }
        />
        <EmptyState
          icon={Search}
          title="O que você procura?"
          description="Use a barra de busca no topo da página para começar."
        />
      </div>
    );
  }

  if (user.role === "parent") {
    const children = await fetchParentChildren(user, user.id);
    const matches = children.filter(({ student }) => {
      const name = student.user.fullName.toLowerCase();
      const code = student.enrollmentCode.toLowerCase();
      return name.includes(query) || code.includes(query);
    });

    return (
      <div className="space-y-6">
        <PageHeader
          title={`Resultados para "${q}"`}
          description={`${matches.length} filho(s) encontrado(s)`}
        />
        {matches.length === 0 ? (
          <EmptyState title="Nenhum filho encontrado" description="Tente buscar pelo nome ou matrícula." />
        ) : (
          matches.map(({ student }) => (
            <Card key={student.id}>
              <CardHeader>
                <UserIdentity
                  name={student.user.fullName}
                  avatarUrl={student.user.avatarUrl}
                  subtitle={student.classGroup?.name ?? "Sem turma"}
                  size="md"
                />
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link href={`/dashboard/responsavel/filho/${student.id}`}>
                  <Badge variant="default">Ver detalhes</Badge>
                </Link>
                <Link href={`/dashboard/alunos/${student.id}/boletim`}>
                  <Badge variant="secondary">Boletim</Badge>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  }

  if (user.role === "student") {
    const student = await prisma.student.findFirst({
      where: { userId: user.id },
      include: {
        grades: true,
        studentMissions: { include: { mission: true } },
      },
    });
    if (!student) redirect("/dashboard/aluno");

    const gradeMatches = student.grades.filter(
      (g) => g.subject.toLowerCase().includes(query) || g.period.toLowerCase().includes(query)
    );
    const missionMatches = student.studentMissions.filter(
      (sm) =>
        sm.mission.title.toLowerCase().includes(query) ||
        (sm.mission.description?.toLowerCase().includes(query) ?? false)
    );

    const total = gradeMatches.length + missionMatches.length;

    return (
      <div className="space-y-6">
        <PageHeader title={`Resultados para "${q}"`} description={`${total} resultado(s) nas suas informações`} />
        {gradeMatches.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Suas notas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {gradeMatches.map((g) => (
                <div key={g.id} className="flex justify-between rounded-lg border p-3">
                  <span>{g.subject} · {g.period}</span>
                  <Badge>{g.value.toFixed(1)}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {missionMatches.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Suas missões</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {missionMatches.map((sm) => (
                <div key={sm.id} className="rounded-lg border p-3">
                  <p className="font-medium">{sm.mission.title}</p>
                  <p className="text-sm text-slate-500">
                    {sm.completedAt ? "Concluída" : "Em andamento"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {total === 0 && (
          <EmptyState title="Nada encontrado" description="Tente buscar por disciplina ou nome de missão." />
        )}
      </div>
    );
  }

  const [students, classes, missions] = await Promise.all([
    prisma.student.findMany({
      where: {
        user: { schoolId: user.schoolId },
        OR: [
          { enrollmentCode: { contains: query } },
          { user: { fullName: { contains: query } } },
          { user: { email: { contains: query } } },
        ],
      },
      include: { user: true, classGroup: true },
      take: 10,
    }),
    prisma.classGroup.findMany({
      where: { schoolId: user.schoolId, name: { contains: query } },
      take: 10,
    }),
    prisma.mission.findMany({
      where: {
        schoolId: user.schoolId,
        OR: [{ title: { contains: query } }, { description: { contains: query } }],
      },
      take: 10,
    }),
  ]);

  const total = students.length + classes.length + missions.length;

  return (
    <div className="space-y-6">
      <PageHeader title={`Resultados para "${q}"`} description={`${total} resultado(s) encontrado(s)`} />

      {students.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Alunos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {students.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/alunos/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.user.fullName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {s.enrollmentCode} · {s.classGroup?.name ?? "Sem turma"}
                  </p>
                </div>
                <Badge className="shrink-0">Nv. {s.level}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {classes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Turmas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {classes.map((c) => (
              <Link
                key={c.id}
                href="/dashboard/turmas"
                className="block rounded-lg border p-3 hover:bg-slate-50"
              >
                {c.name} · {c.gradeLevel}º ano
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {missions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Missões</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {missions.map((m) => (
              <Link
                key={m.id}
                href="/dashboard/gamificacao"
                className="block rounded-lg border p-3 hover:bg-slate-50"
              >
                <p className="font-medium">{m.title}</p>
                <p className="text-xs text-slate-500">{m.description}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {total === 0 && (
        <EmptyState title="Nenhum resultado" description="Tente outro termo de busca." />
      )}
    </div>
  );
}
