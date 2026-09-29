import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  normalizeSearchText,
  matchPersonName,
  matchEmail,
  matchEnrollmentCode,
  matchUsername,
  matchGeneralText,
} from "@/lib/search-matcher";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !user.schoolId) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim();
    const norm = normalizeSearchText(query);

    if (!norm || norm.length < 2) {
      return NextResponse.json({ students: [], classes: [], teachers: [], missions: [] });
    }

    const isStaff =
      user.role === "admin" ||
      user.role === "director" ||
      user.role === "secretary" ||
      user.role === "teacher";

    const [studentsRaw, classesRaw, staffRaw, missionsRaw] = await Promise.all([
      // 1. Alunos da escola
      prisma.student
        .findMany({
          where: {
            OR: [
              { user: { schoolId: user.schoolId } },
              { classGroup: { schoolId: user.schoolId } },
              { classEnrollments: { some: { classGroup: { schoolId: user.schoolId } } } },
            ],
          },
          select: {
            id: true,
            enrollmentCode: true,
            level: true,
            user: { select: { fullName: true, email: true, username: true, avatarUrl: true } },
            classGroup: { select: { name: true } },
          },
          take: 300,
        })
        .catch(() => []),

      // 2. Turmas
      isStaff
        ? prisma.classGroup
            .findMany({
              where: { schoolId: user.schoolId },
              select: { id: true, name: true, gradeLevel: true, year: true },
              take: 50,
            })
            .catch(() => [])
        : Promise.resolve([]),

      // 3. Professores e Equipe
      isStaff
        ? prisma.user
            .findMany({
              where: {
                schoolId: user.schoolId,
                role: { in: ["teacher", "secretary", "director", "admin"] },
              },
              select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
              take: 50,
            })
            .catch(() => [])
        : Promise.resolve([]),

      // 4. Missões
      prisma.mission
        .findMany({
          where: { schoolId: user.schoolId },
          select: { id: true, title: true, description: true, xpReward: true },
          take: 50,
        })
        .catch(() => []),
    ]);

    // Filtragem de Alunos com eliminação de falsos positivos
    const scoredStudents = studentsRaw
      .map((s) => {
        let score = 0;
        const nameMatch = matchPersonName(s.user?.fullName, norm);
        if (nameMatch.matches) score += nameMatch.score;

        const codeMatch = matchEnrollmentCode(s.enrollmentCode, norm);
        if (codeMatch.matches) score += codeMatch.score;

        const userMatch = matchUsername(s.user?.username, norm);
        if (userMatch.matches) score += userMatch.score;

        const emailMatch = matchEmail(s.user?.email, norm);
        if (emailMatch.matches) score += emailMatch.score;

        const classMatch = matchGeneralText(s.classGroup?.name, norm, "Turma");
        if (classMatch.matches) score += classMatch.score;

        return { student: s, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const students = scoredStudents.slice(0, 5).map(({ student: s }) => ({
      id: s.id,
      title: s.user?.fullName ?? "Aluno",
      subtitle: `${s.enrollmentCode ? `Matrícula: ${s.enrollmentCode} · ` : ""}${s.classGroup?.name ?? "Sem turma"}`,
      level: s.level,
      avatarUrl: s.user?.avatarUrl ?? null,
      href: `/dashboard/alunos/${s.id}`,
      type: "aluno" as const,
    }));

    // Turmas
    const classes = classesRaw
      .filter((c) => {
        const nameMatch = matchGeneralText(c.name, norm, "Turma");
        const gradeMatch = matchGeneralText(String(c.gradeLevel ?? ""), norm, "Ano");
        return nameMatch.matches || gradeMatch.matches;
      })
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: `${c.gradeLevel}º ano · Ano letivo ${c.year}`,
        href: "/dashboard/turmas",
        type: "turma" as const,
      }));

    // Professores / Equipe
    const scoredStaff = staffRaw
      .map((t) => {
        let score = 0;
        const nameMatch = matchPersonName(t.fullName, norm);
        if (nameMatch.matches) score += nameMatch.score;

        const emailMatch = matchEmail(t.email, norm);
        if (emailMatch.matches) score += emailMatch.score;

        return { member: t, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const teachers = scoredStaff.slice(0, 3).map(({ member: t }) => {
      const roleLabel =
        t.role === "director"
          ? "Diretor(a)"
          : t.role === "secretary"
            ? "Secretaria"
            : t.role === "admin"
              ? "Administrador"
              : "Professor(a)";

      return {
        id: t.id,
        title: t.fullName,
        subtitle: `${roleLabel} · ${t.email}`,
        avatarUrl: t.avatarUrl ?? null,
        href: "/dashboard/professores",
        type: "professor" as const,
      };
    });

    // Missões
    const missions = missionsRaw
      .filter((m) => {
        const titleMatch = matchGeneralText(m.title, norm, "Missão");
        const descMatch = matchGeneralText(m.description, norm, "Descrição");
        return titleMatch.matches || descMatch.matches;
      })
      .slice(0, 3)
      .map((m) => ({
        id: m.id,
        title: m.title,
        subtitle: m.description || `Recompensa: +${m.xpReward} XP`,
        href: "/dashboard/gamificacao",
        type: "missao" as const,
      }));

    return NextResponse.json({ students, classes, teachers, missions });
  } catch (error) {
    console.error("[api:search:live]", error);
    return NextResponse.json({ students: [], classes: [], teachers: [], missions: [] });
  }
}
