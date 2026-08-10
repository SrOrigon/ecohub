import { eduhubAiGenerateQuestions } from "@/lib/eduhub-ai/engine";

export type GeneratedQuestion = {
  prompt: string;
  type: "choice" | "text";
  points: number;
  options: { id: string; text: string; isCorrect: boolean }[];
};

/** Gera questões via EduHub IA local — especialista pedagógico, sem API externa. */
export function generateQuestionsLocally(
  topic: string,
  subject: string,
  count: number
): GeneratedQuestion[] {
  return eduhubAiGenerateQuestions(topic, subject, count);
}

/** EduHub IA local — nunca usa API externa. */
export async function generateQuestionsWithAi(
  topic: string,
  subject: string,
  count: number,
  bncc?: string
): Promise<GeneratedQuestion[]> {
  return eduhubAiGenerateQuestions(topic, subject, count, bncc);
}
