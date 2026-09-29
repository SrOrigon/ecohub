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
import { Search, GraduationCap, Users, BookOpen, Sparkles, Shield } from "lucide-react";
import { sortByTextPt, sortStudentsByName, sortTeachersByName } from "@/lib/sort-order";

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
          title="Busca"
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
        take: 300,
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

      // 3. Missões da escola (apenas colunas existentes)
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
            take: 50,
          }).catch((err) => {
            console.error("[busca:teachers]", err);
            return [];
          })
        : Promise.resolve([]),
    ]);

    // Filtros em memória (tolerantes a maiúsculas/minúsculas e acentos)
    const matchingStudents = studentsRaw.filter((s) => {
      const name = normalizeText(s.user?.fullName);
      const email = normalizeText(s.user?.email);
      const code = normalizeText(s.enrollmentCode);
      const className = normalizeText(s.classGroup?.name);
      return name.includes(query) || email.includes(query) || code.includes(query) || className.includes(query);
    });

    const matchingClasses = classesRaw.filter((c) => {
      const name = normalizeText(c.name);
      const grade = normalizeText(String(c.gradeLevel ?? ""));
      return name.includes(query) || grade.includes(query);
    });

    const matchingMissions = missionsRaw.filter((m) => {
      const title = normalizeText(m.title);
      const desc = normalizeText(m.description);
      return title.includes(query) || desc.includes(query);
    });

    const matchingTeachers = teachersRaw.filter((t) => {
      const name = normalizeText(t.fullName);
      const email = normalizeText(t.email);
      return name.includes(query) || email.includes(query);
    });

    const sortedStudents = sortStudentsByName(matchingStudents);
    const sortedClasses = sortByTextPt(matchingClasses, (turma) => turma.name);
    const sortedMissions = sortByTextPt(matchingMissions, (mission) => mission.title);
    const sortedTeachers = sortTeachersByName(matchingTeachers);

    const total =
      sortedStudents.length +
      sortedClasses.length +
      sortedMissions.length +
      sortedTeachers.length;

    return (
      <div className="space-y-6">
        <PageHeader
          title={`Resultados para "${rawQuery}"`}
          description={`${total} resultado(s) encontrado(s)`}
        />

        {/* ALUNOS */}
        {sortedStudents.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4 text-[color:var(--school-primary)]" />
                Alunos ({sortedStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                {sortedStudents.map((s) => (
                  <Link
                    key={s.id}
                    href={`/dashboard/alunos/${s.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-[color:var(--school-primary)] hover:bg-[var(--hover)] hover:shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--school-primary-soft)] text-xs font-bold text-[color:var(--school-primary)]">
                        {(s.user?.fullName ?? "A").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {s.user?.fullName ?? "Aluno"}
                        </p>
                        <p className="truncate text-xs text-[var(--muted-foreground)]">
                          Matrícula: {s.enrollmentCode || "—"} · {s.classGroup?.name ?? "Sem turma"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      Nv. {s.level ?? 1}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PROFESSORES */}
        {sortedTeachers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Professores ({sortedTeachers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                {sortedTeachers.map((t) => (
                  <Link
                    key={t.id}
                    href="/dashboard/professores"
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-[color:var(--school-primary)] hover:bg-[var(--hover)] hover:shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {(t.fullName ?? "P").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {t.fullName}
                        </p>
                        <p className="truncate text-xs text-[var(--muted-foreground)]">
                          {t.email}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs text-emerald-700 dark:text-emerald-300">
                      Professor
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* TURMAS */}
        {sortedClasses.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Turmas ({sortedClasses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sortedClasses.map((c) => (
                  <Link
                    key={c.id}
                    href="/dashboard/turmas"
                    className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-[color:var(--school-primary)] hover:bg-[var(--hover)] hover:shadow-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">{c.name}</p>
                      <p className="truncate text-xs text-[var(--muted-foreground)]">
                        {c.gradeLevel}º ano · {c.year}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      Turma
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* MISSÕES */}
        {sortedMissions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Missões ({sortedMissions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                {sortedMissions.map((m) => (
                  <Link
                    key={m.id}
                    href="/dashboard/gamificacao"
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-amber-400 hover:bg-[var(--hover)] hover:shadow-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">{m.title}</p>
                      <p className="truncate text-xs text-[var(--muted-foreground)]">{m.description || "Sem descrição"}</p>
                    </div>
                    {m.xpReward > 0 && (
                      <Badge variant="secondary" className="shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        +{m.xpReward} XP
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {total === 0 && (
          <EmptyState
            icon={Search}
            title={`Nenhum resultado para "${rawQuery}"`}
            description="Tente buscar por outro nome de aluno, turma, professor ou missão."
          />
        )}
      </div>
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
