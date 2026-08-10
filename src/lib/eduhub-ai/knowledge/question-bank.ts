import type { GeneratedQuestion } from "@/lib/ai-questions";

type BankEntry = { keywords: string[]; questions: GeneratedQuestion[] };

const MATH_BANK: BankEntry[] = [
  {
    keywords: ["fraç", "frac", "numerador", "denominador"],
    questions: [
      {
        prompt: "Qual é o resultado de 1/2 + 1/4?",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "3/4", isCorrect: true },
          { id: "b", text: "2/4", isCorrect: false },
          { id: "c", text: "1/3", isCorrect: false },
          { id: "d", text: "2/6", isCorrect: false },
        ],
      },
      {
        prompt: "Frações equivalentes têm o mesmo valor. 2/4 é equivalente a:",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "1/2", isCorrect: true },
          { id: "b", text: "1/4", isCorrect: false },
          { id: "c", text: "3/4", isCorrect: false },
        ],
      },
      {
        prompt: "Explique com suas palavras o que é uma fração equivalente.",
        type: "text",
        points: 2,
        options: [],
      },
    ],
  },
  {
    keywords: ["equaç", "algebra", "incógnita", "x"],
    questions: [
      {
        prompt: "Resolva: x + 5 = 12. Qual o valor de x?",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "7", isCorrect: true },
          { id: "b", text: "17", isCorrect: false },
          { id: "c", text: "5", isCorrect: false },
        ],
      },
      {
        prompt: "Se 2x = 10, então x vale:",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "5", isCorrect: true },
          { id: "b", text: "20", isCorrect: false },
          { id: "c", text: "8", isCorrect: false },
        ],
      },
    ],
  },
  {
    keywords: ["geometr", "área", "perímetro", "triângulo", "retângulo"],
    questions: [
      {
        prompt: "Um retângulo com base 4 cm e altura 3 cm tem área de:",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "12 cm²", isCorrect: true },
          { id: "b", text: "7 cm²", isCorrect: false },
          { id: "c", text: "14 cm²", isCorrect: false },
        ],
      },
      {
        prompt: "O perímetro de um quadrado de lado 5 cm é:",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "20 cm", isCorrect: true },
          { id: "b", text: "25 cm", isCorrect: false },
          { id: "c", text: "10 cm", isCorrect: false },
        ],
      },
    ],
  },
];

const PORTUGUESE_BANK: BankEntry[] = [
  {
    keywords: ["interpret", "texto", "leitura", "compreens"],
    questions: [
      {
        prompt: "Ao interpretar um texto, o leitor deve identificar principalmente:",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "A ideia central e informações explícitas e implícitas", isCorrect: true },
          { id: "b", text: "Apenas as palavras desconhecidas", isCorrect: false },
          { id: "c", text: "Somente o título", isCorrect: false },
        ],
      },
      {
        prompt: "Escreva um parágrafo resumindo um texto que você leu recentemente na escola.",
        type: "text",
        points: 2,
        options: [],
      },
    ],
  },
  {
    keywords: ["gramática", "substantivo", "verbo", "adjetivo", "classe"],
    questions: [
      {
        prompt: 'Na frase "O aluno estudioso aprendeu rápido", a palavra "estudioso" é:',
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "Adjetivo", isCorrect: true },
          { id: "b", text: "Substantivo", isCorrect: false },
          { id: "c", text: "Verbo", isCorrect: false },
        ],
      },
      {
        prompt: "Identifique o verbo na frase: Maria corre no parque todas as manhãs.",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "corre", isCorrect: true },
          { id: "b", text: "Maria", isCorrect: false },
          { id: "c", text: "parque", isCorrect: false },
        ],
      },
    ],
  },
];

const SCIENCE_BANK: BankEntry[] = [
  {
    keywords: ["fotossíntese", "planta", "clorofila"],
    questions: [
      {
        prompt: "A fotossíntese ocorre principalmente em qual parte da planta?",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "Folhas", isCorrect: true },
          { id: "b", text: "Raízes", isCorrect: false },
          { id: "c", text: "Caule apenas", isCorrect: false },
        ],
      },
    ],
  },
  {
    keywords: ["sistema solar", "planeta", "sol", "lua"],
    questions: [
      {
        prompt: "Qual astro é uma estrela e fornece luz e calor à Terra?",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "Sol", isCorrect: true },
          { id: "b", text: "Lua", isCorrect: false },
          { id: "c", text: "Marte", isCorrect: false },
        ],
      },
    ],
  },
];

const HISTORY_BANK: BankEntry[] = [
  {
    keywords: ["independencia", "1822", "brasil", "dom pedro"],
    questions: [
      {
        prompt: "Em que ano foi proclamada a Independência do Brasil?",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "1822", isCorrect: true },
          { id: "b", text: "1889", isCorrect: false },
          { id: "c", text: "1500", isCorrect: false },
        ],
      },
    ],
  },
  {
    keywords: ["colonizacao", "portugal", "indigenas"],
    questions: [
      {
        prompt: "A principal atividade econômica inicial do Brasil colonial foi:",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "Plantation de cana-de-açúcar", isCorrect: true },
          { id: "b", text: "Industrialização", isCorrect: false },
          { id: "c", text: "Mineração de petróleo", isCorrect: false },
        ],
      },
    ],
  },
];

const GEO_BANK: BankEntry[] = [
  {
    keywords: ["latitude", "longitude", "coordenada", "mapa"],
    questions: [
      {
        prompt: "Linhas de latitude medem a distância em relação ao:",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "Equador", isCorrect: true },
          { id: "b", text: "Meridiano de Greenwich", isCorrect: false },
          { id: "c", text: "Polo Sul apenas", isCorrect: false },
        ],
      },
    ],
  },
  {
    keywords: ["bioma", "amazonia", "cerrado", "caatinga"],
    questions: [
      {
        prompt: "Qual bioma brasileiro possui maior biodiversidade e floresta tropical?",
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "Amazônia", isCorrect: true },
          { id: "b", text: "Caatinga", isCorrect: false },
          { id: "c", text: "Pampa", isCorrect: false },
        ],
      },
    ],
  },
];

const ENGLISH_BANK: BankEntry[] = [
  {
    keywords: ["present simple", "ingles", "english", "verb to be"],
    questions: [
      {
        prompt: 'Choose the correct form: She ___ to school every day.',
        type: "choice",
        points: 1,
        options: [
          { id: "a", text: "goes", isCorrect: true },
          { id: "b", text: "go", isCorrect: false },
          { id: "c", text: "going", isCorrect: false },
        ],
      },
    ],
  },
];

const SUBJECT_BANKS: Record<string, BankEntry[]> = {
  Matemática: MATH_BANK,
  Português: PORTUGUESE_BANK,
  Ciências: SCIENCE_BANK,
  História: HISTORY_BANK,
  Geografia: GEO_BANK,
  Inglês: ENGLISH_BANK,
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function scoreEntry(entry: BankEntry, topic: string) {
  const t = normalize(topic);
  return entry.keywords.reduce((s, kw) => (t.includes(normalize(kw)) ? s + 2 : s), 0);
}

export function findQuestionsFromBank(
  topic: string,
  subject: string,
  count: number
): GeneratedQuestion[] {
  const bank = SUBJECT_BANKS[subject] ?? [...MATH_BANK, ...PORTUGUESE_BANK];
  const ranked = bank
    .map((entry) => ({ entry, score: scoreEntry(entry, topic) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const pool: GeneratedQuestion[] = [];
  for (const { entry } of ranked) {
    for (const q of entry.questions) {
      if (!pool.some((p) => p.prompt === q.prompt)) pool.push(structuredClone(q));
    }
  }

  if (pool.length === 0) {
    return [];
  }

  while (pool.length < count) {
    pool.push(...pool.map((q) => ({ ...q, prompt: q.prompt.replace(/^\(\d+\)/, `(${pool.length + 1})`) })));
  }

  return pool.slice(0, Math.min(count, 10));
}
