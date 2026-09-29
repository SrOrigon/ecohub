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
  normalizeSearchText,
  matchPersonName,
  matchEmail,
  matchEnrollmentCode,
  matchUsername,
  matchGeneralText,
} from "@/lib/search-matcher";
import {
  BuscaView,
  type SearchStudent,
  type SearchStaff,
  type SearchParent,
  type SearchClass,
  type SearchMission,
  type SearchApplication,
} from "./busca-view";

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
  const query = normalizeSearchText(rawQuery);

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
                : "Digite um termo na barra de busca do topo para encontrar alunos, responsáveis, equipe ou turmas."
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

  // 1. Perfil RESPONSÁVEL (Parent)
  if (user.role === "parent") {
    try {
      const children = await fetchParentChildren(user, user.id);
      const matches = sortByTextPt(
        children.filter(({ student }) => {
          const nameMatch = matchPersonName(student.user?.fullName, query);
          const codeMatch = matchEnrollmentCode(student.enrollmentCode, query);
          return nameMatch.matches || codeMatch.matches;
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
            <EmptyState
              title="Nenhum filho encontrado"
              description="Tente buscar pelo nome ou número de matrícula."
            />
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

  // 2. Perfil ALUNO (Student)
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

      const gradeMatches = (student.grades ?? []).filter((g) => {
        const subMatch = matchGeneralText(g.subject, query, "Disciplina");
        const perMatch = matchGeneralText(g.period, query, "Período");
        return subMatch.matches || perMatch.matches;
      });

      const missionMatches = (student.studentMissions ?? []).filter((sm) => {
        const titleMatch = matchGeneralText(sm.mission?.title, query, "Missão");
        const descMatch = matchGeneralText(sm.mission?.description, query, "Descrição");
        return titleMatch.matches || descMatch.matches;
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
                    <span className="font-medium text-[var(--foreground)]">
                      {g.subject} · {g.period}
                    </span>
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

  // 3. Perfil GESTÃO & DOCÊNCIA (Admin, Diretor, Secretária, Professor)
  const isManagement = user.role === "admin" || user.role === "director" || user.role === "secretary";

  try {
    const [studentsRaw, classesRaw, missionsRaw, staffRaw, parentsRaw, applicationsRaw] =
      await Promise.all([
        // 1. Alunos da escola (via user.schoolId ou turma da escola)
        prisma.student
          .findMany({
            where: {
              OR: [
                { user: { schoolId: user.schoolId } },
                { classGroup: { schoolId: user.schoolId } },
                { classEnrollments: { some: { classGroup: { schoolId: user.schoolId } } } },
              ],
            },
            include: {
              user: {
                select: { id: true, fullName: true, email: true, username: true, avatarUrl: true },
              },
              classGroup: {
                select: { id: true, name: true, gradeLevel: true },
              },
              parentLinks: {
                include: {
                  parent: {
                    select: { id: true, fullName: true, email: true, phone: true },
                  },
                },
              },
            },
            take: 1000,
          })
          .catch((err) => {
            console.error("[busca:students]", err);
            return [];
          }),

        // 2. Turmas da escola
        prisma.classGroup
          .findMany({
            where: { schoolId: user.schoolId },
            select: { id: true, name: true, gradeLevel: true, year: true },
            take: 150,
          })
          .catch((err) => {
            console.error("[busca:classes]", err);
            return [];
          }),

        // 3. Missões da escola
        prisma.mission
          .findMany({
            where: { schoolId: user.schoolId },
            select: {
              id: true,
              title: true,
              description: true,
              xpReward: true,
              coinReward: true,
            },
            take: 150,
          })
          .catch((err) => {
            console.error("[busca:missions]", err);
            return [];
          }),

        // 4. Professores e Equipe escolar
        isManagement
          ? prisma.user
              .findMany({
                where: {
                  schoolId: user.schoolId,
                  role: { in: ["teacher", "secretary", "director", "admin", "staff"] },
                },
                select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
                take: 300,
              })
              .catch((err) => {
                console.error("[busca:staff]", err);
                return [];
              })
          : prisma.user
              .findMany({
                where: { schoolId: user.schoolId, role: "teacher" },
                select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
                take: 60,
              })
              .catch((err) => {
                console.error("[busca:teachers]", err);
                return [];
              }),

        // 5. Responsáveis vinculados à escola
        isManagement
          ? prisma.user
              .findMany({
                where: {
                  role: "parent",
                  OR: [
                    { schoolId: user.schoolId },
                    { parentLinks: { some: { student: { user: { schoolId: user.schoolId } } } } },
                    { parentLinks: { some: { student: { classGroup: { schoolId: user.schoolId } } } } },
                  ],
                },
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                  avatarUrl: true,
                  parentLinks: {
                    include: {
                      student: {
                        include: {
                          user: { select: { fullName: true } },
                          classGroup: { select: { name: true } },
                        },
                      },
                    },
                  },
                },
                take: 500,
              })
              .catch((err) => {
                console.error("[busca:parents]", err);
                return [];
              })
          : Promise.resolve([]),

        // 6. Inscrições / Pré-Matrículas
        isManagement
          ? prisma.enrollmentApplication
              .findMany({
                where: { schoolId: user.schoolId },
                select: {
                  id: true,
                  studentName: true,
                  parentName: true,
                  parentEmail: true,
                  parentPhone: true,
                  gradeLevel: true,
                  status: true,
                },
                take: 100,
              })
              .catch((err) => {
                console.error("[busca:applications]", err);
                return [];
              })
          : Promise.resolve([]),
      ]);

    // Processamento ALUNOS com pontuação de precisão
    const matchingStudents: Array<SearchStudent & { score: number }> = [];
    for (const s of studentsRaw) {
      let score = 0;
      const matchReasons: string[] = [];
      let parentNote: string | null = null;

      // 1. Nome do aluno (prioridade máxima)
      const nameMatch = matchPersonName(s.user?.fullName, query);
      if (nameMatch.matches) {
        score += nameMatch.score;
        matchReasons.push(nameMatch.reason || "Nome");
      }

      // 2. Matrícula
      const codeMatch = matchEnrollmentCode(s.enrollmentCode, query);
      if (codeMatch.matches) {
        score += codeMatch.score;
        matchReasons.push(codeMatch.reason || "Matrícula");
      }

      // 3. Username (@usuario)
      const userMatch = matchUsername(s.user?.username, query);
      if (userMatch.matches) {
        score += userMatch.score;
        matchReasons.push(userMatch.reason || "Usuário");
      }

      // 4. E-mail (preciso, sem falsos positivos de substrings como luciana/allana)
      const emailMatch = matchEmail(s.user?.email, query);
      if (emailMatch.matches) {
        score += emailMatch.score;
        matchReasons.push(emailMatch.reason || "E-mail");
      }

      // 5. Turma
      const classMatch = matchGeneralText(s.classGroup?.name, query, "Turma");
      if (classMatch.matches) {
        score += classMatch.score;
        matchReasons.push("Turma");
      }

      // 6. Responsável vinculado ao aluno
      for (const pl of s.parentLinks ?? []) {
        const parentMatch = matchPersonName(pl.parent?.fullName, query);
        if (parentMatch.matches) {
          score += Math.max(100, parentMatch.score - 200);
          parentNote = `Responsável: ${pl.parent?.fullName}`;
          matchReasons.push("Responsável");
          break;
        }
      }

      if (score > 0 && matchReasons.length > 0) {
        matchingStudents.push({
          id: s.id,
          fullName: s.user?.fullName ?? "Aluno",
          email: s.user?.email ?? null,
          avatarUrl: s.user?.avatarUrl ?? null,
          enrollmentCode: s.enrollmentCode ?? "",
          className: s.classGroup?.name ?? "Sem turma",
          level: s.level ?? 1,
          matchReasons,
          parentNote,
          score,
        });
      }
    }

    // Ordenar alunos: maior pontuação primeiro, depois ordem alfabética
    matchingStudents.sort(
      (a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName, "pt-BR")
    );

    // Processamento RESPONSÁVEIS
    const matchingParents: Array<SearchParent & { score: number }> = [];
    for (const p of parentsRaw) {
      let score = 0;
      const matchReasons: string[] = [];

      const nameMatch = matchPersonName(p.fullName, query);
      if (nameMatch.matches) {
        score += nameMatch.score;
        matchReasons.push(nameMatch.reason || "Nome");
      }

      const emailMatch = matchEmail(p.email, query);
      if (emailMatch.matches) {
        score += emailMatch.score;
        matchReasons.push(emailMatch.reason || "E-mail");
      }

      if (p.phone && normalizeSearchText(p.phone).includes(query)) {
        score += 200;
        matchReasons.push("Telefone");
      }

      if (score > 0) {
        const children = (p.parentLinks ?? [])
          .map((pl) => ({
            id: pl.student?.id ?? "",
            fullName: pl.student?.user?.fullName ?? "Aluno",
            className: pl.student?.classGroup?.name ?? "Sem turma",
          }))
          .filter((c) => Boolean(c.id));

        matchingParents.push({
          id: p.id,
          fullName: p.fullName,
          email: p.email ?? null,
          phone: p.phone ?? null,
          avatarUrl: p.avatarUrl ?? null,
          children,
          matchReasons,
          score,
        });
      }
    }

    matchingParents.sort(
      (a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName, "pt-BR")
    );

    // Processamento PROFESSORES E EQUIPE
    const matchingStaff: Array<SearchStaff & { score: number }> = [];
    for (const st of staffRaw) {
      let score = 0;
      const matchReasons: string[] = [];

      const nameMatch = matchPersonName(st.fullName, query);
      if (nameMatch.matches) {
        score += nameMatch.score;
        matchReasons.push(nameMatch.reason || "Nome");
      }

      const emailMatch = matchEmail(st.email, query);
      if (emailMatch.matches) {
        score += emailMatch.score;
        matchReasons.push(emailMatch.reason || "E-mail");
      }

      if (score > 0) {
        matchingStaff.push({
          id: st.id,
          fullName: st.fullName,
          email: st.email,
          role: st.role,
          avatarUrl: st.avatarUrl ?? null,
          matchReasons,
          score,
        });
      }
    }

    matchingStaff.sort(
      (a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName, "pt-BR")
    );

    // Processamento TURMAS
    const matchingClasses: SearchClass[] = classesRaw
      .filter((c) => {
        const matchName = matchGeneralText(c.name, query, "Turma");
        const matchGrade = matchGeneralText(String(c.gradeLevel ?? ""), query, "Ano");
        return matchName.matches || matchGrade.matches;
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        gradeLevel: String(c.gradeLevel ?? ""),
        year: c.year ?? 2026,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    // Processamento MISSÕES
    const matchingMissions: SearchMission[] = missionsRaw
      .filter((m) => {
        const matchTitle = matchGeneralText(m.title, query, "Missão");
        const matchDesc = matchGeneralText(m.description, query, "Descrição");
        return matchTitle.matches || matchDesc.matches;
      })
      .map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description ?? null,
        xpReward: m.xpReward ?? 0,
        coinReward: m.coinReward ?? 0,
      }))
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

    // Processamento INSCRIÇÕES / PRÉ-MATRÍCULAS
    const matchingApplications: SearchApplication[] = [];
    for (const app of applicationsRaw) {
      const matchStudent = matchPersonName(app.studentName, query);
      const matchParent = matchPersonName(app.parentName, query);
      const matchEmailRes = matchEmail(app.parentEmail, query);

      const matchReasons: string[] = [];
      if (matchStudent.matches) matchReasons.push("Candidato");
      if (matchParent.matches) matchReasons.push("Responsável");
      if (matchEmailRes.matches) matchReasons.push("E-mail");

      if (matchReasons.length > 0) {
        matchingApplications.push({
          id: app.id,
          studentName: app.studentName,
          parentName: app.parentName,
          parentEmail: app.parentEmail,
          parentPhone: app.parentPhone ?? null,
          gradeLevel: app.gradeLevel,
          status: app.status,
          matchReasons,
        });
      }
    }

    return (
      <BuscaView
        initialQuery={rawQuery}
        students={matchingStudents}
        staff={matchingStaff}
        parents={matchingParents}
        classes={matchingClasses}
        missions={matchingMissions}
        applications={matchingApplications}
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
