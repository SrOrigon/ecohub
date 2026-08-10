import type { GeneratedQuestion } from "@/lib/ai-questions";
import { normalizeText } from "@/lib/eduhub-ai/matcher";

const CHOICE_TEMPLATES = [
  (topic: string, i: number) => ({
    prompt: `(${i}) Qual afirmação sobre "${topic}" está correta?`,
    correct: `Conceito principal de ${topic}`,
    wrong: ["Definição incompleta", "Conceito de outro tema", "Afirmação oposta ao correto"],
  }),
  (topic: string, i: number) => ({
    prompt: `(${i}) Em ${topic}, a melhor estratégia de resolução é:`,
    correct: "Identificar dados, aplicar conceito e verificar a resposta",
    wrong: ["Chutar a alternativa maior", "Ignorar enunciado", "Usar fórmula sem sentido"],
  }),
];

const TEXT_TEMPLATES = [
  (topic: string, i: number) =>
    `(${i}) Explique com suas palavras o que é ${topic} e dê um exemplo do cotidiano.`,
  (topic: string, i: number) =>
    `(${i}) Compare ${topic} com um conceito relacionado estudado em sala e destaque diferenças.`,
];

export function synthesizeQuestions(
  topic: string,
  subject: string,
  count: number,
  bncc?: string
): GeneratedQuestion[] {
  const t = topic.trim() || "o tema";
  const bnccNote = bncc ? ` (BNCC: ${bncc})` : "";
  const out: GeneratedQuestion[] = [];

  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      const tpl = CHOICE_TEMPLATES[i % CHOICE_TEMPLATES.length](t, i + 1);
      out.push({
        prompt: `${tpl.prompt}${bnccNote}`,
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: tpl.correct, isCorrect: true },
          ...tpl.wrong.slice(0, 3).map((w, j) => ({ id: String.fromCharCode(98 + j), text: w, isCorrect: false })),
        ],
      });
    } else {
      out.push({
        prompt: `${TEXT_TEMPLATES[i % TEXT_TEMPLATES.length](t, i + 1)}${bnccNote}`,
        type: "text",
        points: 2,
        options: [],
      });
    }
  }

  return out;
}

export function personalizeQuestion(q: GeneratedQuestion, topic: string, index: number): GeneratedQuestion {
  const clone = structuredClone(q);
  const key = normalizeText(topic).slice(0, 12);
  if (key && !normalizeText(clone.prompt).includes(key)) {
    clone.prompt = `[${topic}] ${clone.prompt}`;
  }
  clone.prompt = clone.prompt.replace(/^\(\d+\)\s*/, `(${index + 1}) `);
  return clone;
}

export function formatQuestionsForChat(questions: GeneratedQuestion[]): string {
  const lines = questions.map((q, i) => {
    let block = `**Q${i + 1}.** ${q.prompt} (${q.points} pt${q.points > 1 ? "s" : ""})`;
    if (q.type === "choice" && q.options.length) {
      block += "\n" + q.options.map((o, j) => `   ${String.fromCharCode(65 + j)}) ${o.text}`).join("\n");
    }
    return block;
  });
  return `**Questões geradas (EduHub IA local):**\n\n${lines.join("\n\n")}\n\n💡 Use **Gerar com EduHub IA** no passo 3 dos exercícios para importar automaticamente.`;
}
