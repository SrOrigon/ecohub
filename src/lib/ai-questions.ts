import { ecohubAiGenerateQuestions } from "@/lib/ecohub-ai/engine";

export type GeneratedQuestion = {
  prompt: string;
  type: "choice" | "text";
  points: number;
  options: { id: string; text: string; isCorrect: boolean }[];
};

/** Gera questões via Ecohub IA local — especialista pedagógico, sem API externa. */
export function generateQuestionsLocally(
  topic: string,
  subject: string,
  count: number
): GeneratedQuestion[] {
  return ecohubAiGenerateQuestions(topic, subject, count);
}

/** Ecohub IA local — nunca usa API externa. */
export async function generateQuestionsWithAi(
  topic: string,
  subject: string,
  count: number,
  bncc?: string
): Promise<GeneratedQuestion[]> {
  return ecohubAiGenerateQuestions(topic, subject, count, bncc);
}
