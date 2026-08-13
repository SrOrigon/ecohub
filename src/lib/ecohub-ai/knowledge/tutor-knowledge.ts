export type TutorSnippet = {
  patterns: RegExp[];
  answer: string;
  followUp?: string;
};

/** Base de conhecimento pedagógico da Ecohub IA — especialista em educação básica (BNCC). */
export const TUTOR_SNIPPETS: TutorSnippet[] = [
  {
    patterns: [/fraç/i, /numerador/i, /denominador/i],
    answer:
      "Fração representa partes de um todo. O numerador (de cima) indica quantas partes você tem; o denominador (de baixo) indica em quantas partes o todo foi dividido. Ex.: 3/4 = 3 partes de um total de 4.",
    followUp: "Tente somar frações com mesmo denominador primeiro — é o passo mais seguro.",
  },
  {
    patterns: [/fotoss[ií]ntese/i, /planta/i, /clorofila/i],
    answer:
      "Fotossíntese é o processo em que plantas usam luz solar, água e CO₂ para produzir glicose (energia) e oxigênio. Acontece principalmente nas folhas, graças à clorofila.",
  },
  {
    patterns: [/substantivo/i, /adjetivo/i, /verbo/i, /classe.*gramatical/i],
    answer:
      "Classes gramaticais: substantivo nomeia seres/coisa (casa, Maria); verbo indica ação ou estado (correr, ser); adjetivo caracteriza o substantivo (alto, azul). Dica: pergunte 'o que é?' → substantivo; 'o que faz?' → verbo.",
  },
  {
    patterns: [/equaç/i, /incógnita/i, /\bx\b/i, /algebra/i],
    answer:
      "Equação é uma igualdade com incógnita (letra). Para resolver, isole o x: faça a mesma operação nos dois lados. Ex.: x + 3 = 10 → x = 10 − 3 = 7.",
  },
  {
    patterns: [/presença|falta|frequência/i, /justific/i],
    answer:
      "Frequência escolar é importante para seu aprendizado e para a escola cumprir a lei. Se faltar, peça ao responsável para justificar no portal Ecohub com o motivo (consulta médica, etc.).",
  },
  {
    patterns: [/xp|moeda|missão|gamifica/i, /nível/i],
    answer:
      "No Ecohub você ganha XP com notas, presença, missões e exercícios. Moedas servem para resgatar prêmios na loja. Missões precisam de confirmação do professor após você concluir a tarefa.",
  },
  {
    patterns: [/como estudar/i, /dica.*estud/i, /prova/i, /vestibul/i],
    answer:
      "Rotina de estudo eficiente: (1) revise em blocos de 25–30 min; (2) faça resumos com suas palavras; (3) resolva exercícios similares aos da prova; (4) durma bem na véspera. Repetição espaçada fixa melhor que maratonas.",
  },
  {
    patterns: [/bncc/i, /base nacional/i],
    answer:
      "A BNCC (Base Nacional Comum Curricular) define o que alunos devem aprender em cada etapa no Brasil. Seu professor alinha atividades e avaliações a essas competências — pergunte qual habilidade a atividade desenvolve.",
  },
  {
    patterns: [/bullying|agress/i, /briga/i],
    answer:
      "Se você presenciar ou sofrer bullying, fale com um adulto de confiança (professor, coordenação, responsável). Não responda com violência. A escola deve acolher e investigar — você não está sozinho.",
  },
];

export const TUTOR_GREETING =
  "Olá! Sou a **Ecohub IA**, especialista em educação básica (BNCC). Posso ajudar com dúvidas de matérias, dicas de estudo, gamificação e uso do portal. O que você gostaria de saber?";

export const TUTOR_FALLBACK =
  "Posso ajudar com **matérias**, **BNCC**, **planos de aula**, **comunicados**, **agenda compartilhada** e uso do Ecohub. Professores podem pedir geração de questões no passo de criação de exercícios.";
