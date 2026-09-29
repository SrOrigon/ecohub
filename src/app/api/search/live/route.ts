import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function normalize(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !user.schoolId) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim();
    const norm = normalize(query);

    if (!norm || norm.length < 2) {
      return NextResponse.json({ students: [], classes: [], teachers: [], missions: [] });
    }

    const isStaff = user.role === "admin" || user.role === "director" || user.role === "secretary" || user.role === "teacher";

    const [studentsRaw, classesRaw, teachersRaw, missionsRaw] = await Promise.all([
      // Alunos
      prisma.student.findMany({
        where: { user: { schoolId: user.schoolId } },
        select: {
          id: true,
          enrollmentCode: true,
          level: true,
          user: { select: { fullName: true, email: true, avatarUrl: true } },
          classGroup: { select: { name: true } },
        },
        take: 200,
      }).catch(() => []),

      // Turmas
      isStaff
        ? prisma.classGroup.findMany({
            where: { schoolId: user.schoolId },
            select: { id: true, name: true, gradeLevel: true, year: true },
            take: 50,
          }).catch(() => [])
        : Promise.resolve([]),

      // Professores (se admin/diretor/secretaria)
      user.role === "admin" || user.role === "director" || user.role === "secretary"
        ? prisma.user.findMany({
            where: { schoolId: user.schoolId, role: "teacher" },
            select: { id: true, fullName: true, email: true, avatarUrl: true },
            take: 30,
          }).catch(() => [])
        : Promise.resolve([]),

      // Missões
      prisma.mission.findMany({
        where: { schoolId: user.schoolId },
        select: { id: true, title: true, description: true, xpReward: true },
        take: 50,
      }).catch(() => []),
    ]);

    const students = studentsRaw
      .filter((s) => {
        const name = normalize(s.user?.fullName);
        const email = normalize(s.user?.email);
        const code = normalize(s.enrollmentCode);
        const cName = normalize(s.classGroup?.name);
        return name.includes(norm) || email.includes(norm) || code.includes(norm) || cName.includes(norm);
      })
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        title: s.user?.fullName ?? "Aluno",
        subtitle: `${s.enrollmentCode ? `Matrícula: ${s.enrollmentCode} · ` : ""}${s.classGroup?.name ?? "Sem turma"}`,
        level: s.level,
        avatarUrl: s.user?.avatarUrl ?? null,
        href: `/dashboard/alunos/${s.id}`,
        type: "aluno" as const,
      }));

    const classes = classesRaw
      .filter((c) => normalize(c.name).includes(norm) || normalize(String(c.gradeLevel)).includes(norm))
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: `${c.gradeLevel}º ano · Ano letivo ${c.year}`,
        href: "/dashboard/turmas",
        type: "turma" as const,
      }));

    const teachers = teachersRaw
      .filter((t) => normalize(t.fullName).includes(norm) || normalize(t.email).includes(norm))
      .slice(0, 3)
      .map((t) => ({
        id: t.id,
        title: t.fullName,
        subtitle: t.email,
        avatarUrl: t.avatarUrl ?? null,
        href: "/dashboard/professores",
        type: "professor" as const,
      }));

    const missions = missionsRaw
      .filter((m) => normalize(m.title).includes(norm) || normalize(m.description).includes(norm))
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
