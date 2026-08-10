import type { TutorSnippet } from "@/lib/eduhub-ai/knowledge/tutor-knowledge";

/** Conhecimento expandido — história, geografia, inglês, operações, plataforma EduHub. */
export const EXTENDED_SNIPPETS: TutorSnippet[] = [
  {
    patterns: [/porcentagem|percentual|%/i, /desconto/i],
    answer:
      "Porcentagem é uma fração de base 100. Para calcular x% de um valor: multiplique o valor por x e divida por 100. Ex.: 20% de 50 = 50 × 20 ÷ 100 = 10.",
    followUp: "Em provas, identifique sempre o valor total (100%) antes de aplicar a regra.",
  },
  {
    patterns: [/potencia|expoente|notacao cientifica/i],
    answer:
      "Potenciação repete a multiplicação da base. Ex.: 2³ = 2×2×2 = 8. Notação científica escreve números grandes como a × 10ⁿ.",
  },
  {
    patterns: [/triangulo|pitagoras|hipotenusa/i],
    answer:
      "Teorema de Pitágoras (triângulo retângulo): a² + b² = c², onde c é a hipotenusa. Só vale para triângulos com um ângulo de 90°.",
  },
  {
    patterns: [/crase|a\s+a/i],
    answer:
      "Crase é a fusão de preposição 'a' + artigo 'a(s)'. Teste: substitua por 'a casa' — se couber 'à casa', há crase. Ex.: Vou à escola.",
  },
  {
    patterns: [/concordancia|sujeito.*verbo/i],
    answer:
      "Concordância verbal: verbo concorda com o sujeito em número e pessoa. Atenção a sujeito oracional e expressões partitivas.",
  },
  {
    patterns: [/colonizacao|indigenas|descobrimento/i, /1500|brasil colonial/i],
    answer:
      "A colonização do Brasil envolveu povoamento português, economia açucareira e conflitos com populações indígenas.",
  },
  {
    patterns: [/independencia.*brasil|1822|dom pedro/i],
    answer:
      "Independência do Brasil (1822): rompimento com Portugal, proclamada por Dom Pedro I.",
  },
  {
    patterns: [/clima|bioma|amazonia|cerrado/i],
    answer:
      "Biomas brasileiros: Amazônia, Cerrado, Caatinga, Mata Atlântica, Pampa, Pantanal — cada um com clima e vegetação próprios.",
  },
  {
    patterns: [/latitude|longitude|equador/i],
    answer:
      "Latitude mede distância ao Equador (N/S); longitude mede distância ao Meridiano de Greenwich (E/O).",
  },
  {
    patterns: [/present simple|verb to be|ingles.*basico/i],
    answer:
      "Present Simple: rotinas e fatos. I/you/we/they + verbo; he/she/it + verbo-s. To be: I am, you are, he is.",
  },
  {
    patterns: [/past simple|preterito.*ingles/i],
    answer:
      "Past Simple: ações concluídas. Regulares: +ed. Irregulares: formas próprias (go → went).",
  },
  {
    patterns: [/cadeia alimentar|ecossistema/i],
    answer:
      "Cadeia alimentar: produtores → consumidores → decompositores. Desequilíbrio afeta todo o ecossistema.",
  },
  {
    patterns: [/ciclo.*agua|evaporacao|precipitacao/i],
    answer:
      "Ciclo da água: evaporação → condensação (nuvens) → precipitação (chuva) → infiltração → repete.",
  },
  {
    patterns: [/agenda compartilhada|calendario escolar/i],
    answer:
      "A **Agenda compartilhada** (/dashboard/calendario) centraliza feriados e eventos. Direção, secretaria e professores publicam; todos veem.",
  },
  {
    patterns: [/matricula|inscricao online/i],
    answer:
      "Matrículas: link `/inscricao/[slug]`. Secretaria aprova em **Matrículas**.",
  },
  {
    patterns: [/eduhub ia|assistente local/i],
    answer:
      "A **EduHub IA** roda 100% local — sem API paga. BNCC, questões, planos de aula, comunicados e dicas por perfil.",
  },
  {
    patterns: [/ansiedade.*prova|medo.*prova/i],
    answer:
      "Ansiedade de prova: respire 4-4-4, durma bem, simule condições reais. Peça apoio se for frequente.",
  },
];

export const ROLE_GREETINGS: Record<string, string> = {
  teacher: "Professor(a), posso ajudar com planos de aula, questões, rubricas e comunicados.",
  director: "Diretor(a), trago insights de desempenho, alertas e fechamento de bimestre.",
  secretary: "Secretaria, auxilio em matrículas, autorizações e comunicados.",
  parent: "Responsável, oriento sobre notas, faltas e hábitos de estudo.",
  student: "Aluno(a), explico matérias, dicas de prova e XP.",
};

export const SUGGESTED_TOPICS = [
  "Frações e porcentagem",
  "Interpretação de texto",
  "Fotossíntese",
  "Independência do Brasil",
  "Present Simple",
  "Plano de aula",
];
