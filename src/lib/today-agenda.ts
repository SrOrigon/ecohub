import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { getTodaySchoolStatus, getUpcomingEvents } from "@/lib/school-calendar";
import { fetchTodayPersonalNotes } from "@/lib/reads/personal-note-reads";
import type { TodayItem } from "@/components/student/today-checklist";
import { formatDate } from "@/lib/utils";

export async function getTodayAgendaForStudent(
  studentId: string,
  classId: string | null,
  schoolId: string | null,
  actor?: SessionUser
) {
  const [student, settings, announcements, trails, todayNotes] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        studentMissions: { include: { mission: true } },
        exerciseSubmissions: { select: { exerciseId: true, status: true } },
        trailProgress: { include: { trail: { include: { steps: { orderBy: { sortOrder: "asc" } } } } } },
      },
    }),
    getSchoolSettings(schoolId),
    prisma.announcement.findMany({
      where: {
        schoolId: schoolId ?? undefined,
        OR: [{ classId: null }, { classId: classId ?? undefined }],
      },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    prisma.learningTrail.findMany({
      where: {
        schoolId: schoolId ?? undefined,
        isActive: true,
        OR: [{ classId: null }, { classId: classId ?? undefined }],
      },
      include: {
        steps: { orderBy: { sortOrder: "asc" } },
        progress: { where: { studentId } },
      },
      take: 5,
    }),
    actor ? fetchTodayPersonalNotes(actor, actor.id) : Promise.resolve([]),
  ]);

  if (!student) return { items: [] as TodayItem[], dayStatus: null, events: [] };

  const exercises = await prisma.exercise.findMany({
    where: {
      schoolId: schoolId ?? undefined,
      isActive: true,
      OR: [{ classId: null }, { classId: classId ?? undefined }],
    },
    include: { submissions: { where: { studentId } } },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  const [dayStatus, events, pendingHomeTasks] = await Promise.all([
    Promise.resolve(getTodaySchoolStatus(settings)),
    Promise.resolve(getUpcomingEvents(settings, 3)),
    prisma.homeTask.findMany({
      where: { studentId, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const submissionMap = new Map(student.exerciseSubmissions.map((s) => [s.exerciseId, s.status]));
  const completedMissions = new Set(
    student.studentMissions.filter((m) => m.completedAt).map((m) => m.missionId)
  );

  const items: TodayItem[] = [];

  for (const note of todayNotes) {
    items.push({
      id: `note-${note.id}`,
      title: note.title ?? "Minha anotação",
      subtitle: note.content.slice(0, 80) + (note.content.length > 80 ? "…" : ""),
      href: "/dashboard/agenda",
      done: false,
      cta: "Ver agenda",
      badge: "Anotação",
    });
  }

  for (const ht of pendingHomeTasks) {
    items.push({
      id: `home-${ht.id}`,
      title: ht.title,
      subtitle: ht.description ?? "Tarefa de casa da família",
      href: "/dashboard/aluno#tarefas-casa",
      done: false,
      cta: "Concluir",
      badge: `+${ht.xpReward} XP`,
    });
  }

  for (const ex of exercises) {
    const status = submissionMap.get(ex.id);
    if (status === "graded" || status === "submitted") continue;
    items.push({
      id: `ex-${ex.id}`,
      title: ex.title,
      subtitle: ex.dueDate ? `Prazo: ${formatDate(ex.dueDate)}` : "Exercício / prova",
      href: `/dashboard/exercicios/${ex.id}`,
      done: false,
      cta: "Responder",
      badge: `+${ex.xpReward} XP`,
    });
  }

  const openMissions = await prisma.mission.findMany({
    where: {
      schoolId: schoolId ?? undefined,
      isActive: true,
      OR: [{ classId: null }, { classId: classId ?? undefined }],
      id: { notIn: [...completedMissions] },
    },
    take: 3,
  });

  for (const m of openMissions) {
    items.push({
      id: `mission-${m.id}`,
      title: m.title,
      subtitle: m.description ?? "Missão gamificada",
      href: "/dashboard/aluno#missoes",
      done: false,
      cta: "Ver missão",
      badge: `+${m.xpReward} XP`,
    });
  }

  for (const trail of trails) {
    const prog = trail.progress[0];
    if (prog?.completedAt) continue;
    const step = trail.steps[prog?.currentStep ?? 0];
    items.push({
      id: `trail-${trail.id}`,
      title: trail.title,
      subtitle: step?.title ?? `Etapa ${(prog?.currentStep ?? 0) + 1} de ${trail.steps.length}`,
      href: "/dashboard/trilhas",
      done: false,
      cta: "Continuar trilha",
      badge: "Trilha",
    });
  }

  for (const ann of announcements) {
    items.push({
      id: `ann-${ann.id}`,
      title: ann.title,
      subtitle: "Comunicado da escola",
      href: "/dashboard/comunicados",
      done: false,
      cta: "Ler",
      badge: "Novo",
    });
  }

  for (const ev of events.filter((e) => e.isToday)) {
    items.push({
      id: `ev-${ev.date}`,
      title: ev.label,
      subtitle: "Evento escolar hoje",
      href: "/dashboard/calendario",
      done: false,
      cta: "Ver agenda",
    });
  }

  return { items: items.slice(0, 8), dayStatus, events };
}

export async function getTodayAgendaForTeacher(actor: SessionUser, schoolId: string | null) {
  const [settings, todayNotes] = await Promise.all([
    getSchoolSettings(schoolId),
    fetchTodayPersonalNotes(actor, actor.id),
  ]);
  const dayStatus = getTodaySchoolStatus(settings);
  const events = getUpcomingEvents(settings, 5);

  const classes = await prisma.classGroup.findMany({
    where: { teacherId: actor.id },
    include: { _count: { select: { students: true } } },
  });

  const pendingSubmissions = await prisma.exerciseSubmission.count({
    where: {
      status: "submitted",
      exercise: { teacherId: actor.id },
    },
  });

  const items: TodayItem[] = todayNotes.map((note) => ({
    id: `note-${note.id}`,
    title: note.title ?? "Minha anotação",
    subtitle: note.content.slice(0, 80) + (note.content.length > 80 ? "…" : ""),
    href: "/dashboard/agenda",
    done: false,
    cta: "Ver agenda",
    badge: "Anotação",
  }));

  items.push(
    ...events
      .filter((e) => e.isToday || e.daysUntil <= 2)
      .map((e) => ({
        id: `ev-${e.date}`,
        title: e.label,
        subtitle: e.isToday ? "Hoje" : `Em ${e.daysUntil} dia(s)`,
        href: "/dashboard/calendario",
        done: false,
        cta: "Ver calendário",
      }))
  );

  if (pendingSubmissions > 0) {
    items.unshift({
      id: "pending-grades",
      title: `${pendingSubmissions} entrega(s) para corrigir`,
      subtitle: "Exercícios aguardando correção",
      href: "/dashboard/exercicios",
      done: false,
      cta: "Corrigir",
      badge: "Urgente",
    });
  }

  for (const c of classes) {
    items.push({
      id: `class-${c.id}`,
      title: c.name,
      subtitle: `${c._count.students} alunos`,
      href: "/dashboard/diario",
      done: false,
      cta: "Diário de classe",
    });
  }

  return { items: items.slice(0, 8), dayStatus, events, classCount: classes.length };
}
