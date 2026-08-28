import type { QuestionType } from "@/lib/exercises";
import { flashcardBackOption, trueFalseOptions } from "@/lib/exercises";

export type DraftQuestion = {
  prompt: string;
  type: QuestionType;
  points: number;
  xpReward: number;
  options: { id: string; text: string; isCorrect: boolean }[];
};

export function newQuestion(type: QuestionType = "choice", points = 2, xpReward = 20): DraftQuestion {
  if (type === "true_false") {
    return { prompt: "", type, points, xpReward, options: trueFalseOptions() };
  }
  if (type === "flashcard") {
    return { prompt: "", type, points, xpReward, options: flashcardBackOption() };
  }
  if (type === "text") {
    return { prompt: "", type, points, xpReward, options: [] };
  }
  return {
    prompt: "",
    type,
    points,
    xpReward,
    options: [
      { id: "a", text: "", isCorrect: true },
      { id: "b", text: "", isCorrect: false },
    ],
  };
}

export function parseBoundedInt(value: string, fallback = 0) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return fallback;
  const parsed = parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseBoundedFloat(value: string, fallback = 0) {
  const normalized = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function validateDraftQuestions(questions: DraftQuestion[]) {
  if (questions.length === 0) return "Adicione pelo menos uma questão.";
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    if (!question.prompt.trim()) {
      return `A questão ${index + 1} precisa de enunciado.`;
    }
    if (question.type === "choice") {
      const filledOptions = question.options.filter((option) => option.text.trim());
      if (filledOptions.length < 2) {
        return `A questão ${index + 1} precisa de pelo menos duas alternativas.`;
      }
      if (!question.options.some((option) => option.isCorrect && option.text.trim())) {
        return `Marque a alternativa correta na questão ${index + 1}.`;
      }
    }
    if (question.type === "flashcard" && !question.options[0]?.text.trim()) {
      return `Informe o verso do cartão na questão ${index + 1}.`;
    }
  }
  return null;
}
