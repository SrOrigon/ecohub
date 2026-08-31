export type FlashcardItem = {
  id: string;
  front: string;
  back: string;
  subject: string;
  box: 1 | 2 | 3 | 4;
  lastReviewedAt?: string;
  nextReviewDays: number;
};

export const DEFAULT_FLASHCARDS: FlashcardItem[] = [
  {
    id: "fc-1",
    front: "O que é Mitocôndria e qual sua função principal?",
    back: "Organela celular responsável pela respiração celular e produção de energia (ATP).",
    subject: "Biologia",
    box: 1,
    nextReviewDays: 1,
  },
  {
    id: "fc-2",
    front: "Qual é a fórmula da área do triângulo?",
    back: "Área = (Base × Altura) / 2",
    subject: "Matemática",
    box: 2,
    nextReviewDays: 3,
  },
  {
    id: "fc-3",
    front: "O que caracteriza uma oração subordinada substantiva?",
    back: "É a oração que exerce a função de um substantivo na oração principal (sujeito, objeto, etc.).",
    subject: "Português",
    box: 1,
    nextReviewDays: 1,
  },
  {
    id: "fc-4",
    front: "Em que ano ocorreu a Proclamação da República no Brasil?",
    back: "15 de Novembro de 1889, liderada pelo Marechal Deodoro da Fonseca.",
    subject: "História",
    box: 3,
    nextReviewDays: 7,
  },
  {
    id: "fc-5",
    front: "Qual a 1ª Lei de Newton (Lei da Inércia)?",
    back: "Um corpo em repouso tende a permanecer em repouso e um corpo em movimento tende a permanecer em movimento retilíneo uniforme, a menos que uma força atue sobre ele.",
    subject: "Física",
    box: 2,
    nextReviewDays: 3,
  },
];

/**
 * Calcula o próximo estado do card com base na resposta do aluno (Sistema Leitner)
 */
export function calculateNextReview(
  currentBox: 1 | 2 | 3 | 4,
  performance: "easy" | "hard" | "forgot"
): { nextBox: 1 | 2 | 3 | 4; nextDays: number } {
  if (performance === "forgot") {
    return { nextBox: 1, nextDays: 1 };
  }
  if (performance === "hard") {
    const daysMap = { 1: 1, 2: 3, 3: 7, 4: 14 };
    return { nextBox: currentBox, nextDays: daysMap[currentBox] };
  }
  // easy: sobe de caixa
  const nextBox = Math.min(4, currentBox + 1) as 1 | 2 | 3 | 4;
  const daysMap = { 1: 1, 2: 3, 3: 7, 4: 14 };
  return { nextBox, nextDays: daysMap[nextBox] };
}
