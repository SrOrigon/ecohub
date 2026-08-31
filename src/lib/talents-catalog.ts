export type TalentDefinition = {
  key: string;
  name: string;
  category: "utilidade" | "estudos" | "duelos";
  description: string;
  bonusText: string;
  iconName: "Shield" | "Coins" | "Clock" | "Swords" | "Sparkles" | "BookOpen";
  costPoints: number;
  minLevel: number;
  prerequisiteKey?: string;
};

export const TALENT_DETAIL_PREFIX = "talent:";

export const TALENTS_CATALOG: TalentDefinition[] = [
  {
    key: "streak_shield",
    name: "Escudo da Ofensiva",
    category: "utilidade",
    description: "Protege sua contagem de ofensiva de zerar caso você fique um dia sem entrar.",
    bonusText: "Ofensiva protegida contra 1 falha",
    iconName: "Shield",
    costPoints: 1,
    minLevel: 2,
  },
  {
    key: "midas_touch",
    name: "Toque de Midas",
    category: "utilidade",
    description: "Ganha moedas extras sempre que tirar nota máxima em exercícios e provas.",
    bonusText: "+10% de moedas ganhas",
    iconName: "Coins",
    costPoints: 1,
    minLevel: 3,
    prerequisiteKey: "streak_shield",
  },
  {
    key: "hyper_focus",
    name: "Mente Hiperfocada",
    category: "estudos",
    description: "Multiplica o XP recebido ao concluir blocos de estudo no Modo Pomodoro.",
    bonusText: "+15 XP por sessão de foco",
    iconName: "Clock",
    costPoints: 2,
    minLevel: 4,
    prerequisiteKey: "streak_shield",
  },
  {
    key: "stem_mastery",
    name: "Maestria em Exatas",
    category: "estudos",
    description: "Compreensão avançada de cálculos, lógica e fenômenos da natureza.",
    bonusText: "+15% de XP em Matemática e Ciências",
    iconName: "Sparkles",
    costPoints: 2,
    minLevel: 5,
    prerequisiteKey: "hyper_focus",
  },
  {
    key: "duel_master",
    name: "Gladiador do Saber",
    category: "duelos",
    description: "Bônus especial de prestígio e comemoração após vitórias em duelos 1v1.",
    bonusText: "+10 XP bônus em vitórias de duelo",
    iconName: "Swords",
    costPoints: 2,
    minLevel: 4,
  },
  {
    key: "wordsmith",
    name: "Linguista Nato",
    category: "estudos",
    description: "Facilidade de expressão, vocabulário refinado e leitura crítica.",
    bonusText: "+15% de XP em Português e Redação",
    iconName: "BookOpen",
    costPoints: 3,
    minLevel: 6,
    prerequisiteKey: "stem_mastery",
  },
];

export function spentTalentPoints(unlockedKeys: string[]) {
  return TALENTS_CATALOG.filter((talent) => unlockedKeys.includes(talent.key)).reduce(
    (sum, talent) => sum + talent.costPoints,
    0
  );
}
