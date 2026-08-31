export type WeeklyPlannerTask = {
  id: string;
  title: string;
  subject: string;
  type: "exercise" | "hometask" | "review";
  durationMinutes: number;
  xpEstimate: number;
  completed?: boolean;
};

export type DayPlan = {
  dayName: string;
  dayShort: string;
  tasks: WeeklyPlannerTask[];
  totalMinutes: number;
  totalXp: number;
};

const DAYS = [
  { dayName: "Segunda-feira", dayShort: "Seg" },
  { dayName: "Terça-feira", dayShort: "Ter" },
  { dayName: "Quarta-feira", dayShort: "Qua" },
  { dayName: "Quinta-feira", dayShort: "Qui" },
  { dayName: "Sexta-feira", dayShort: "Sex" },
  { dayName: "Sábado", dayShort: "Sáb" },
];

/**
 * Gera um plano semanal equilibrado com base nas tarefas e exercícios pendentes
 */
export function buildWeeklyStudyPlan(
  pendingExercises: { id: string; title: string; xpReward: number }[] = [],
  pendingTasks: { id: string; title: string; xpReward: number }[] = []
): DayPlan[] {
  const allItems: WeeklyPlannerTask[] = [
    ...pendingExercises.map((e) => ({
      id: `ex-${e.id}`,
      title: e.title,
      subject: "Atividade Avaliativa",
      type: "exercise" as const,
      durationMinutes: 25,
      xpEstimate: e.xpReward || 30,
    })),
    ...pendingTasks.map((t) => ({
      id: `task-${t.id}`,
      title: t.title,
      subject: "Tarefa de Casa",
      type: "hometask" as const,
      durationMinutes: 20,
      xpEstimate: t.xpReward || 20,
    })),
    {
      id: "flashcards-daily",
      title: "Revisão de Flashcards Spaced Repetition",
      subject: "Revisão Geral",
      type: "review" as const,
      durationMinutes: 10,
      xpEstimate: 25,
    },
  ];

  return DAYS.map((day, idx) => {
    // Distribui as tarefas de forma equilibrada entre os dias
    const dayTasks = allItems.filter((_, i) => i % DAYS.length === idx);
    if (dayTasks.length === 0) {
      dayTasks.push({
        id: `review-${idx}`,
        title: "Revisão de Conteúdos & Leitura Diária",
        subject: "Fixação",
        type: "review",
        durationMinutes: 15,
        xpEstimate: 20,
      });
    }

    const totalMinutes = dayTasks.reduce((s, t) => s + t.durationMinutes, 0);
    const totalXp = dayTasks.reduce((s, t) => s + t.xpEstimate, 0);

    return {
      dayName: day.dayName,
      dayShort: day.dayShort,
      tasks: dayTasks,
      totalMinutes,
      totalXp,
    };
  });
}
