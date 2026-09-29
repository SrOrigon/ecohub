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
import { Search, BookOpen, Sparkles } from "lucide-react";
import { sortByTextPt } from "@/lib/sort-order";
import {
  BuscaView,
  type SearchStudent,
  type SearchTeacher,
  type SearchClass,
  type SearchMission,
} from "./busca-view";

function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.schoolId) redirect("/dashboard");

  const { q = "" } = await searchParams;
  const rawQuery = q.trim();
  const query = normalizeText(rawQuery);

  if (!query) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Busca Geral"
          description={
            user.role === "parent"
              ? "Encontre informações sobre seus filhos vinculados."
              : user.role === "student"
                ? "Consulte suas notas e missões."
                : "Digite um termo na barra de busca do topo para encontrar alunos, turmas, professores ou missões."
          }
        />
        <EmptyState
          icon={Search}
          title="O que você procura?"
          description="Use a barra de busca no topo da página para começar a pesquisar."
        />
      </div>
    );
  }

  // Busca do perfil Responsável
  if (user.role === "parent") {
    try {
      const children = await fetchParentChildren(user, user.id);
      const matches = sortByTextPt(
        children.filter(({ student }) => {
          const name = normalizeText(student.user?.fullName);
          const code = normalizeText(student.enrollmentCode);
          return name.includes(query) || code.includes(query);
        }),
        ({ student }) => student.user?.fullName ?? ""
      );

      return (
        <div className="space-y-6">
          <PageHeader
            title={`Resultados para "${rawQuery}"`}
            description={`${matches.length} filho(s) encontrado(s)`}
          />
          {matches.length === 0 ? (
            <EmptyState title="Nenhum filho encontrado" description="Tente buscar pelo nome ou matrícula." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {matches.map(({ student }) => (
                <Card key={student.id} className="transition-all hover:shadow-md">
                  <CardHeader>
                    <UserIdentity
                      name={student.user?.fullName ?? "Aluno"}
                      avatarUrl={student.user?.avatarUrl}
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
              ))}
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error("[busca:parent] Falha ao pesquisar filhos:", error);
      return (
        <div className="space-y-6">
          <PageHeader title={`Resultados para "${rawQuery}"`} description="Erro ao buscar dados." />
          <EmptyState title="Falha ao carregar resultados" description="Tente novamente mais tarde." />
        </div>
      );
    }
  }

  // Busca do perfil Aluno
  if (user.role === "student") {
    try {
      const student = await prisma.student.findFirst({
        where: { userId: user.id },
        include: {
          grades: true,
          studentMissions: { include: { mission: true } },
        },
      });
      if (!student) redirect("/dashboard/aluno");

      const gradeMatches = (student.grades ?? []).filter(
        (g) =>
          normalizeText(g.subject).includes(query) ||
          normalizeText(g.period).includes(query)
      );

      const missionMatches = (student.studentMissions ?? []).filter((sm) => {
        const title = normalizeText(sm.mission?.title);
        const desc = normalizeText(sm.mission?.description);
        return title.includes(query) || desc.includes(query);
      });

      const total = gradeMatches.length + missionMatches.length;

      return (
        <div className="space-y-6">
          <PageHeader
            title={`Resultados para "${rawQuery}"`}
            description={`${total} resultado(s) nas suas informações`}
          />
          {gradeMatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-[color:var(--school-primary)]" />
                  Suas notas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {gradeMatches.map((g) => (
                  <div key={g.id} className="flex justify-between rounded-xl border border-[var(--border)] p-3">
                    <span className="font-medium text-[var(--foreground)]">{g.subject} · {g.period}</span>
                    <Badge variant="secondary">{g.value.toFixed(1)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {missionMatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Suas missões
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {missionMatches.map((sm) => (
                  <div key={sm.id} className="rounded-xl border border-[var(--border)] p-3">
                    <p className="font-medium text-[var(--foreground)]">{sm.mission.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
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
    } catch (error) {
      console.error("[busca:student] Falha ao pesquisar:", error);
      return (
        <div className="space-y-6">
          <PageHeader title={`Resultados para "${rawQuery}"`} description="Erro ao buscar dados." />
          <EmptyState title="Falha ao carregar resultados" description="Tente novamente mais tarde." />
        </div>
      );
    }
  }

  // Busca Geral para Gestão (Diretor, Admin, Secretária, Professor)
  const isManagement = user.role === "admin" || user.role === "director" || user.role === "secretary";

  try {
    const [studentsRaw, classesRaw, missionsRaw, teachersRaw] = await Promise.all([
      // 1. Alunos da escola
      prisma.student.findMany({
        where: { user: { schoolId: user.schoolId } },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
          classGroup: {
            select: { id: true, name: true, gradeLevel: true },
          },
        },
        take: 350,
      }).catch((err) => {
        console.error("[busca:students]", err);
        return [];
      }),

      // 2. Turmas da escola
      prisma.classGroup.findMany({
        where: { schoolId: user.schoolId },
        select: { id: true, name: true, gradeLevel: true, year: true },
        take: 100,
      }).catch((err) => {
        console.error("[busca:classes]", err);
        return [];
      }),

      // 3. Missões da escola
      prisma.mission.findMany({
        where: { schoolId: user.schoolId },
        select: {
          id: true,
          title: true,
          description: true,
          xpReward: true,
          coinReward: true,
        },
        take: 100,
      }).catch((err) => {
        console.error("[busca:missions]", err);
        return [];
      }),

      // 4. Professores da escola
      isManagement
        ? prisma.user.findMany({
            where: { schoolId: user.schoolId, role: "teacher" },
            select: { id: true, fullName: true, email: true, avatarUrl: true },
            take: 60,
          }).catch((err) => {
            console.error("[busca:teachers]", err);
            return [];
          })
        : Promise.resolve([]),
    ]);

    // Filtragem e mapeamento de Alunos com detecção de correspondência
    const matchingStudents: SearchStudent[] = [];
    for (const s of studentsRaw) {
      const name = normalizeText(s.user?.fullName);
      const email = normalizeText(s.user?.email);
      const code = normalizeText(s.enrollmentCode);
      const className = normalizeText(s.classGroup?.name);

      const matchReasons: string[] = [];
      if (name.includes(query)) matchReasons.push("Nome");
      if (code.includes(query)) matchReasons.push("Matrícula");
      if (email.includes(query)) matchReasons.push("E-mail");
      if (className.includes(query)) matchReasons.push("Turma");

      if (matchReasons.length > 0) {
        matchingStudents.push({
          id: s.id,
          fullName: s.user?.fullName ?? "Aluno",
          email: s.user?.email ?? null,
          avatarUrl: s.user?.avatarUrl ?? null,
          enrollmentCode: s.enrollmentCode ?? "",
          className: s.classGroup?.name ?? "Sem turma",
          level: s.level ?? 1,
          matchReasons,
        });
      }
    }

    // Priorizar alunos cujo Nome ou Matrícula contenha o termo de busca
    matchingStudents.sort((a, b) => {
      const aName = a.matchReasons.includes("Nome") || a.matchReasons.includes("Matrícula");
      const bName = b.matchReasons.includes("Nome") || b.matchReasons.includes("Matrícula");
      if (aName && !bName) return -1;
      if (!aName && bName) return 1;
      return a.fullName.localeCompare(b.fullName, "pt-BR");
    });

    // Professores
    const matchingTeachers: SearchTeacher[] = [];
    for (const t of teachersRaw) {
      const name = normalizeText(t.fullName);
      const email = normalizeText(t.email);
      const matchReasons: string[] = [];
      if (name.includes(query)) matchReasons.push("Nome");
      if (email.includes(query)) matchReasons.push("E-mail");

      if (matchReasons.length > 0) {
        matchingTeachers.push({
          id: t.id,
          fullName: t.fullName ?? "Professor",
          email: t.email ?? "",
          avatarUrl: t.avatarUrl ?? null,
          matchReasons,
        });
      }
    }
    matchingTeachers.sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));

    // Turmas
    const matchingClasses: SearchClass[] = classesRaw
      .filter((c) => {
        const name = normalizeText(c.name);
        const grade = normalizeText(String(c.gradeLevel ?? ""));
        return name.includes(query) || grade.includes(query);
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        gradeLevel: String(c.gradeLevel ?? ""),
        year: c.year ?? 2026,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    // Missões
    const matchingMissions: SearchMission[] = missionsRaw
      .filter((m) => {
        const title = normalizeText(m.title);
        const desc = normalizeText(m.description);
        return title.includes(query) || desc.includes(query);
      })
      .map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description ?? null,
        xpReward: m.xpReward ?? 0,
        coinReward: m.coinReward ?? 0,
      }))
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

    return (
      <BuscaView
        initialQuery={rawQuery}
        students={matchingStudents}
        teachers={matchingTeachers}
        classes={matchingClasses}
        missions={matchingMissions}
      />
    );
  } catch (error) {
    console.error("[busca:general] Erro inesperado:", error);
    return (
      <div className="space-y-6">
        <PageHeader title={`Resultados para "${rawQuery}"`} description="Busca temporariamente indisponível." />
        <EmptyState
          icon={Search}
          title="Não foi possível concluir a busca"
          description="Ocorreu uma instabilidade na consulta. Tente pesquisar novamente em instantes."
        />
      </div>
    );
  }
}
