export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
  streakLabel: string;
};

/**
 * Calcula a ofensiva de dias consecutivos do aluno com base nas datas de atividades/XP
 */
export function calculateStudentStreak(
  activityDates: (Date | string)[]
): StreakData {
  if (!activityDates || activityDates.length === 0) {
    return {
      currentStreak: 1,
      longestStreak: 1,
      isActiveToday: true,
      streakLabel: "1 dia consecutivo! Comece sua ofensiva!",
    };
  }

  // Normaliza datas para YYYY-MM-DD
  const uniqueDays = Array.from(
    new Set(
      activityDates
        .map((d) => {
          const date = new Date(d);
          if (Number.isNaN(date.getTime())) return null;
          return date.toISOString().split("T")[0];
        })
        .filter((d): d is string => d !== null)
    )
  ).sort((a, b) => b.localeCompare(a)); // decrescente

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const isActiveToday = uniqueDays.includes(todayStr);
  const hasYesterday = uniqueDays.includes(yesterdayStr);

  if (!isActiveToday && !hasYesterday) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, uniqueDays.length),
      isActiveToday: true,
      streakLabel: "Ofensiva iniciada hoje! 🔥",
    };
  }

  let streak = 0;
  const checkDate = new Date();
  if (!isActiveToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dayStr = checkDate.toISOString().split("T")[0];
    if (uniqueDays.includes(dayStr)) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const currentStreak = Math.max(1, streak);
  return {
    currentStreak,
    longestStreak: Math.max(currentStreak, uniqueDays.length),
    isActiveToday: true,
    streakLabel:
      currentStreak === 1
        ? "1 dia de ofensiva! Mantenha o ritmo amanhã!"
        : `${currentStreak} dias consecutivos de estudo! Em chamas! 🔥`,
  };
}
