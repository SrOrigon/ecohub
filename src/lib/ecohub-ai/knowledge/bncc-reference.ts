import { scoreKeywords } from "@/lib/ecohub-ai/matcher";

export type BnccEntry = {
  code: string;
  skill: string;
  subject: string;
  keywords: string[];
};

export const BNCC_SKILLS: BnccEntry[] = [
  {
    code: "EF06MA09",
    subject: "Matemática",
    skill: "Resolver e elaborar problemas envolvendo frações e números racionais.",
    keywords: ["frac", "racional", "matematica"],
  },
  {
    code: "EF07MA18",
    subject: "Matemática",
    skill: "Resolver e elaborar problemas que envolvam equações polinomiais de 1º grau.",
    keywords: ["equacao", "algebra", "incognita", "x"],
  },
  {
    code: "EF08MA01",
    subject: "Matemática",
    skill: "Efetuar cálculos com potências de expoentes inteiros e compreender notação científica.",
    keywords: ["potencia", "notacao cientifica"],
  },
  {
    code: "EF06LP01",
    subject: "Língua Portuguesa",
    skill: "Reconhecer a impossibilidade de neutralidade na informação e analisar interesses.",
    keywords: ["interpretacao", "texto", "leitura"],
  },
  {
    code: "EF67LP28",
    subject: "Língua Portuguesa",
    skill: "Observar elementos de coesão e coerência em textos.",
    keywords: ["coesao", "coerencia", "paragrafo"],
  },
  {
    code: "EF06LP03",
    subject: "Língua Portuguesa",
    skill: "Identificar o gênero textual e reconhecer finalidade comunicativa.",
    keywords: ["genero", "textual", "noticia", "cronica"],
  },
  {
    code: "EF06CI05",
    subject: "Ciências",
    skill: "Explicar a organização básica das células e a relação estrutura-função.",
    keywords: ["celula", "organismo", "ciencias"],
  },
  {
    code: "EF07CI08",
    subject: "Ciências",
    skill: "Relacionar estrutura e função dos sistemas do corpo humano.",
    keywords: ["corpo humano", "sistema", "digestorio", "circulatorio"],
  },
  {
    code: "EF06GE01",
    subject: "Geografia",
    skill: "Compreender a orientação espacial e representação cartográfica.",
    keywords: ["mapa", "cartografia", "geografia", "escala"],
  },
  {
    code: "EF07HI01",
    subject: "História",
    skill: "Identificar conexões entre local, regional e global na formação territorial.",
    keywords: ["historia", "brasil", "colonizacao", "imperio"],
  },
  {
    code: "EF06LI01",
    subject: "Inglês",
    skill: "Interagir em situações cotidianas usando estruturas simples do Present Simple.",
    keywords: ["ingles", "english", "present simple", "verb to be"],
  },
];

export function findBnccSkills(query: string, limit = 3): BnccEntry[] {
  return BNCC_SKILLS.map((e) => ({
    entry: e,
    score: scoreKeywords(query, [...e.keywords, e.subject, e.code]),
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}
