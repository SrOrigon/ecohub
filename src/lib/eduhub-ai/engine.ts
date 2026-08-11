import { findQuestionsFromBank } from "@/lib/eduhub-ai/knowledge/question-bank";
import { findBnccSkills } from "@/lib/eduhub-ai/knowledge/bncc-reference";
import {
  TUTOR_SNIPPETS,
  TUTOR_GREETING,
  TUTOR_FALLBACK,
  type TutorSnippet,
} from "@/lib/eduhub-ai/knowledge/tutor-knowledge";
import { EXTENDED_SNIPPETS, ROLE_GREETINGS, SUGGESTED_TOPICS } from "@/lib/eduhub-ai/knowledge/extended-knowledge";
import {
  draftAnnouncement,
  detectAnnouncementKind,
  lessonPlan,
  rubricTemplate,
  studyPlan,
  feedbackTemplate,
} from "@/lib/eduhub-ai/knowledge/pedagogical-templates";
import { scorePatterns, topMatches } from "@/lib/eduhub-ai/matcher";
import {
  formatQuestionsForChat,
  personalizeQuestion,
  synthesizeQuestions,
} from "@/lib/eduhub-ai/question-synth";
import type { GeneratedQuestion } from "@/lib/ai-questions";

export type EduHubAiRole = "teacher" | "director" | "student" | "parent" | "secretary" | "admin";

export type ParentContext = {
  childName: string;
  avgGrade: number;
  passGrade: number;
  freqRate: number;
  pendingExercises: number;
};

export type AiContext = {
  role: EduHubAiRole;
  userName?: string;
  schoolName?: string;
  stats?: {
    avgGrade?: number;
    attendanceRate?: number;
    atRiskStudents?: number;
    pendingSubmissions?: number;
    passRate?: number;
    healthScore?: number;
  };
  parentContext?: ParentContext;
};

const ALL_SNIPPETS: TutorSnippet[] = [...TUTOR_SNIPPETS, ...EXTENDED_SNIPPETS];

const QUESTION_GEN_STAFF: EduHubAiRole[] = ["teacher", "director", "secretary", "admin"];

function canGenerateQuestions(role: EduHubAiRole): boolean {
  return QUESTION_GEN_STAFF.includes(role);
}

const QUESTION_GEN_PATTERN = /gerar quest|criar quest|questões sobre|exercícios sobre|monte quest|montar quest|fazer quest|lista de quest/i;

const CHEAT_ATTEMPT_PATTERN =
  /gabarito|resposta(s)? (do|da|dos|das) (exerc|prova|atividade|avali)|me (d[aá]|passa) (as )?respostas|cola na prova|colar na prova/i;

const SUBJECT_ALIASES: Record<string, string> = {
  matematica: "Matemática",
  mat: "Matemática",
  portugues: "Português",
  lp: "Português",
  ciencias: "Ciências",
  historia: "História",
  geografia: "Geografia",
  ingles: "Inglês",
  english: "Inglês",
};

function extractTopic(text: string, fallback = "o tema indicado"): string {
  const m =
    text.match(/sobre\s+(.+?)(?:\?|$)/i) ||
    text.match(/de\s+(.+?)(?:\?|$)/i) ||
    text.match(/tema\s+(.+?)(?:\?|$)/i);
  return m?.[1]?.replace(/[?.!]$/, "").trim() || fallback;
}

function detectSubject(text: string): string {
  const n = text.toLowerCase();
  for (const [key, label] of Object.entries(SUBJECT_ALIASES)) {
    if (n.includes(key)) return label;
  }
  return "Matemática";
}

function matchSnippets(text: string): TutorSnippet | null {
  const ranked = topMatches(
    text,
    ALL_SNIPPETS,
    (t, s) => scorePatterns(t, s.patterns),
    1,
    2
  );
  return ranked[0]?.item ?? null;
}

export function eduhubAiGenerateQuestions(
  topic: string,
  subject: string,
  count: number,
  bncc?: string
): GeneratedQuestion[] {
  const fromBank = findQuestionsFromBank(topic, subject, count);
  const hasRealBank = fromBank.some((q) => !q.prompt.includes("escolha ou explique a resposta correta"));

  if (hasRealBank) {
    return fromBank.map((q, i) => personalizeQuestion(q, topic, i));
  }

  const skills = findBnccSkills(`${topic} ${subject}`, 1);
  const code = bncc || skills[0]?.code;
  return synthesizeQuestions(topic, subject, count, code);
}

export function eduhubAiChat(message: string, context: AiContext): string {
  const trimmed = message.trim();
  if (!trimmed) return "Digite sua pergunta para eu ajudar.";

  const firstName = context.userName?.split(" ")[0];
  const roleHint = ROLE_GREETINGS[context.role] ?? "";

  if (/^(oi|olá|ola|hey|bom dia|boa tarde|boa noite|e aí)/i.test(trimmed)) {
    const base = firstName ? TUTOR_GREETING.replace("Olá!", `Olá, ${firstName}!`) : TUTOR_GREETING;
    return roleHint ? `${base}\n\n${roleHint}` : base;
  }

  if (QUESTION_GEN_PATTERN.test(trimmed)) {
    if (!canGenerateQuestions(context.role)) {
      return (
        "A **geração de questões e exercícios** é exclusiva da equipe escolar (professores, direção e secretaria), para garantir avaliações justas.\n\n" +
        "Posso ajudar você a **entender** o conteúdo — por exemplo: *\"Como funciona fotossíntese?\"* ou *\"Explicar frações\"*."
      );
    }
    const topic = extractTopic(trimmed);
    const subject = detectSubject(trimmed);
    const qs = eduhubAiGenerateQuestions(topic, subject, 3);
    return formatQuestionsForChat(qs);
  }

  if (["student", "parent"].includes(context.role) && CHEAT_ATTEMPT_PATTERN.test(trimmed)) {
    return (
      "Não posso fornecer gabarito ou respostas de exercícios e provas — isso prejudica seu aprendizado.\n\n" +
      "Posso **explicar o conteúdo** e dar dicas de estudo. Pergunte sobre o tema (ex.: *\"Como resolver equações?\"*)."
    );
  }

  if (/bncc|habilidade|competencia|codigo ef/i.test(trimmed)) {
    const skills = findBnccSkills(trimmed, 3);
    if (skills.length === 0) {
      return "Informe matéria ou tema (ex.: 'BNCC frações 6º ano'). Posso relacionar habilidades EF06–EF09 da base local.";
    }
    return (
      "**Habilidades BNCC relacionadas:**\n\n" +
      skills.map((s) => `• **${s.code}** (${s.subject}): ${s.skill}`).join("\n")
    );
  }

  if (/plano de aula|sequencia didatica|aula sobre/i.test(trimmed) && ["teacher", "director", "admin"].includes(context.role)) {
    const topic = extractTopic(trimmed, "conteúdo da semana");
    const subject = detectSubject(trimmed);
    return lessonPlan(topic, subject);
  }

  if (/rubrica|criterios de corre/i.test(trimmed) && ["teacher", "director", "admin"].includes(context.role)) {
    return rubricTemplate(extractTopic(trimmed, "atividade avaliativa"));
  }

  if (/feedback para|devolutiva para|mensagem para o aluno/i.test(trimmed) && context.role === "teacher") {
    const nameMatch = trimmed.match(/(?:para|aluno)\s+([A-Za-zÀ-ú]+)/i);
    const name = nameMatch?.[1] ?? "o aluno";
    return feedbackTemplate(name, "seu empenho nas atividades", "revisar os erros das questões abertas com calma");
  }

  if (/plano de estudo|rotina de estudo|como estudar para/i.test(trimmed)) {
    return studyPlan(extractTopic(trimmed, "a prova"), 5);
  }

  if (/rascunho|comunicado|avisar os pais|texto para os pais/i.test(trimmed) && ["director", "teacher", "secretary", "admin"].includes(context.role)) {
    const topic = extractTopic(trimmed, "evento escolar");
    const kind = detectAnnouncementKind(trimmed + " " + topic);
    return draftAnnouncement(topic, kind);
  }

  if (/alerta|risco|evas|desempenho|panorama/i.test(trimmed) && ["director", "secretary", "admin"].includes(context.role)) {
    return eduhubAiDirectorInsight(context);
  }

  if (/fechar bimestre|periodo fechado|nota.*bloque/i.test(trimmed) && ["director", "admin"].includes(context.role)) {
    return "**Fechar bimestre:** em **Configurações → Fechamento de bimestre**, selecione o período e confirme. Notas daquele bimestre ficam bloqueadas para edição — ideal após conferência com professores.";
  }

  if (context.role === "parent" && context.parentContext) {
    const pc = context.parentContext;
    if (/filho|filha|nota|falta|desempenho/i.test(trimmed)) {
      const tips = eduhubAiParentTips({
        childName: pc.childName,
        avgGrade: pc.avgGrade,
        passGrade: pc.passGrade,
        freqRate: pc.freqRate,
        pendingExercises: pc.pendingExercises,
      });
      return `**Sobre ${pc.childName}:**\n\n${tips.map((t) => `• ${t}`).join("\n\n")}`;
    }
  }

  if (/filho|filha|acompanh/i.test(trimmed) && context.role === "parent") {
    return "No portal do responsável você vê notas, faltas, exercícios e pode justificar ausências. Crie **tarefas de casa** gamificadas e use **Mensagens** para falar com a escola.";
  }

  if (/corrigir|entrega|submiss|exercicio pendente/i.test(trimmed) && context.role === "teacher") {
    const n = context.stats?.pendingSubmissions;
    if (n != null && n > 0) {
      return `Há **${n}** entrega(s) aguardando correção. Acesse **Exercícios**, abra a atividade e use a correção por questão. Respostas abertas: use rubrica para agilizar.`;
    }
    return "Abra **Exercícios → [atividade] → entregas pendentes**. Quiz de múltipla escolha corrige automaticamente; dissertativas precisam da sua nota e feedback.";
  }

  const snippet = matchSnippets(trimmed);
  if (snippet) {
    return snippet.followUp ? `${snippet.answer}\n\n💡 ${snippet.followUp}` : snippet.answer;
  }

  const partial = topMatches(
    trimmed,
    ALL_SNIPPETS,
    (t, s) => scorePatterns(t, s.patterns),
    2,
    1
  );
  if (partial.length > 0) {
    const hint = partial.map((p) => p.item.patterns[0]?.source?.replace(/\\b|\\i/g, "") ?? "tema").slice(0, 40);
    return `${fallbackForRole(context.role)}\n\n**Talvez ajude:** tente perguntar sobre ${hint.join(" ou ")}.`;
  }

  return `${fallbackForRole(context.role)}\n\n**Sugestões:** ${suggestionsForRole(context.role).map((t) => `"${t}"`).join(", ")}.`;
}

function fallbackForRole(role: EduHubAiRole): string {
  if (role === "student") {
    return "Posso ajudar com **dúvidas de matérias**, **dicas de estudo**, **BNCC** e uso do EduHub. Não gero exercícios nem gabaritos — pergunte sobre o tema (ex.: *\"O que é fotossíntese?\"*).";
  }
  if (role === "parent") {
    return "Posso orientar sobre **notas, faltas e hábitos de estudo** do seu filho. A geração de exercícios fica com a equipe escolar.";
  }
  return TUTOR_FALLBACK;
}

function suggestionsForRole(role: EduHubAiRole): string[] {
  if (role === "student") {
    return ["Como estudar para prova?", "O que é fotossíntese?", "Explicar frações", "Como ganhar mais XP?"];
  }
  if (role === "parent") {
    return ["Como está meu filho?", "Plano de estudo para prova", "Justificar falta", "Tarefas de casa gamificadas"];
  }
  return SUGGESTED_TOPICS.slice(0, 4);
}

function eduhubAiDirectorInsight(context: AiContext): string {
  const s = context.stats;
  if (!s) {
    return "Acesse **Alertas de risco** no menu. Com dados carregados, resumo médias, frequência e alunos em atenção.";
  }
  const parts: string[] = ["**Panorama rápido da escola:**"];
  if (s.avgGrade != null) {
    const status = s.avgGrade >= 7 ? "✅" : s.avgGrade >= 6 ? "⚠️" : "🔴";
    parts.push(`${status} Média geral: **${s.avgGrade.toFixed(1)}**`);
  }
  if (s.attendanceRate != null) {
    parts.push(`• Frequência média: **${Math.round(s.attendanceRate)}%**`);
  }
  if (s.passRate != null) {
    parts.push(`• Taxa de aprovação (meta): **${Math.round(s.passRate)}%**`);
  }
  if (s.healthScore != null) {
    parts.push(`• Saúde pedagógica institucional: **${s.healthScore}/100**`);
  }
  if (s.atRiskStudents != null && s.atRiskStudents > 0) {
    parts.push(`• 🔴 **${s.atRiskStudents}** aluno(s) em situação de atenção`);
  } else if (s.atRiskStudents === 0) {
    parts.push("• ✅ Nenhum alerta crítico no momento");
  }
  if (s.pendingSubmissions != null && s.pendingSubmissions > 0) {
    parts.push(`• **${s.pendingSubmissions}** entrega(s) aguardando correção (professores)`);
  }
  parts.push("\n**Ações sugeridas:** revisar **Leitura geral** no menu, alertas, agenda compartilhada e contato com famílias em risco.");
  return parts.join("\n");
}

export function eduhubAiParentTips(input: {
  childName: string;
  avgGrade: number;
  passGrade: number;
  freqRate: number;
  pendingExercises: number;
}): string[] {
  const tips: string[] = [];
  if (input.avgGrade < input.passGrade) {
    tips.push(
      `${input.childName} está com média **${input.avgGrade.toFixed(1)}** (mínimo ${input.passGrade}). Reserve 20 min/dia para revisar matérias mais fracas e combine metas semanais.`
    );
  }
  if (input.freqRate < 85) {
    tips.push(
      `Frequência em **${Math.round(input.freqRate)}%**. Confirme rotina de sono e transporte; faltas repetidas merecem conversa com a coordenação.`
    );
  }
  if (input.pendingExercises > 0) {
    tips.push(
      `**${input.pendingExercises}** exercício(s) pendente(s). Acompanhe prazos no boletim e evite deixar para a véspera.`
    );
  }
  if (tips.length === 0) {
    tips.push(
      `${input.childName} está em **bom ritmo** acadêmico. Continue reforçando hábitos de estudo e elogie esforço, não só nota.`
    );
  }
  return tips;
}

export function eduhubAiSuggestionsForRole(role: EduHubAiRole): string[] {
  const byRole: Record<EduHubAiRole, string[]> = {
    teacher: [
      "Plano de aula sobre frações",
      "Gerar 3 questões sobre verbos",
      "Rascunho comunicado reunião de pais",
      "Criar rubrica para redação",
      "Como corrigir entregas pendentes?",
    ],
    director: [
      "Panorama e alertas de risco",
      "Como fechar bimestre?",
      "BNCC equações 7º ano",
      "Rascunho comunicado festa junina",
    ],
    secretary: [
      "Como funciona matrícula online?",
      "Rascunho comunicado secretaria",
      "Autorizações digitais",
      "Agenda compartilhada feriados",
    ],
    parent: [
      "Como está meu filho?",
      "Justificar falta",
      "Plano de estudo para prova",
      "Tarefas de casa gamificadas",
    ],
    student: [
      "Como estudar para prova?",
      "O que é fotossíntese?",
      "Como ganhar mais XP?",
      "Explicar frações",
    ],
    admin: ["Panorama da escola", "Alertas de risco", "BNCC interpretação de texto"],
  };
  return byRole[role] ?? SUGGESTED_TOPICS.slice(0, 5);
}
