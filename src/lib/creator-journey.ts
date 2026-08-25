export type CreatorJourneyStep = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

export type CreatorJourneySnapshot = {
  steps: CreatorJourneyStep[];
  completed: number;
  total: number;
  remainingLabel?: string;
};

export function buildCreatorJourney(data: {
  hasClass: boolean;
  hasStudents: boolean;
  hasTrail: boolean;
}): CreatorJourneySnapshot {
  const steps: CreatorJourneyStep[] = [
    { id: "account", label: "Conta criada", done: true },
    {
      id: "students",
      label: "Importe alunos",
      done: data.hasStudents,
      href: "/dashboard/alunos",
    },
    {
      id: "share",
      label: "Compartilhe com alunos",
      done: data.hasStudents,
      href: "/dashboard/comunicados",
    },
    {
      id: "trail",
      label: "Crie sua 1ª trilha",
      done: data.hasTrail,
      href: "/dashboard/trilhas",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const remaining = steps.find((s) => !s.done);

  return {
    steps,
    completed,
    total: steps.length,
    remainingLabel: remaining?.label,
  };
}

export function greetingForHour(hour = new Date().getHours()): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
