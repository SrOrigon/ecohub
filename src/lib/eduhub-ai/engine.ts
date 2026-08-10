import { findQuestionsFromBank } from "@/lib/eduhub-ai/knowledge/question-bank";
import {
  TUTOR_FALLBACK,
  TUTOR_GREETING,
  TUTOR_SNIPPETS,
} from "@/lib/eduhub-ai/knowledge/tutor-knowledge";
import type { GeneratedQuestion } from "@/lib/ai-questions";

export type EduHubAiRole = "teacher" | "director" | "student" | "parent" | "secretary" | "admin";

export type AiContext = {
  role: EduHubAiRole;
  userName?: string;
  schoolName?: string;
  /** Dados agregados opcionais para insights */
  stats?: {
    avgGrade?: number;
    attendanceRate?: number;
    atRiskStudents?: number;
    pendingSubmissions?: number;
  };
};

export function eduhubAiGenerateQuestions(
  topic: string,
  subject: string,
  count: number,
  _bncc?: string
): GeneratedQuestion[] {
  return findQuestionsFromBank(topic, subject, count);
}

export function eduhubAiChat(message: string, context: AiContext): string {
  const trimmed = message.trim();
  if (!trimmed) return "Digite sua pergunta para eu ajudar.";

  if (/^(oi|olá|ola|hey|bom dia|boa tarde|boa noite)/i.test(trimmed)) {
    const name = context.userName?.split(" ")[0];
    return name ? TUTOR_GREETING.replace("Olá!", `Olá, ${name}!`) : TUTOR_GREETING;
  }

  if (/gerar quest|criar quest|exercício sobre|questões sobre/i.test(trimmed)) {
    const topicMatch = trimmed.match(/sobre\s+(.+)/i);
    const topic = topicMatch?.[1]?.replace(/[?.!]$/, "") ?? "o tema indicado";
    return `Para gerar questões sobre "${topic}", use o botão **Gerar com EduHub IA** no formulário de exercícios (passo 3). Escolha a matéria e informe o tema — minha base pedagógica local criará questões alinhadas à BNCC, sem depender de internet externa.`;
  }

  if (/rascunho|comunicado|avisar os pais/i.test(trimmed) && ["director", "teacher", "secretary", "admin"].includes(context.role)) {
    return eduhubAiDraftAnnouncement(trimmed);
  }

  if (/alerta|risco|evas|desempenho/i.test(trimmed) && ["director", "secretary", "admin"].includes(context.role)) {
    return eduhubAiDirectorInsight(context);
  }

  if (/filho|filha|acompanh/i.test(trimmed) && context.role === "parent") {
    return "No portal do responsável você vê notas, faltas, exercícios e pode justificar ausências. Dica: crie **tarefas de casa** gamificadas para reforçar o que a escola ensina — isso aumenta engajamento sem substituir o professor.";
  }

  for (const snippet of TUTOR_SNIPPETS) {
    if (snippet.patterns.some((p) => p.test(trimmed))) {
      return snippet.followUp ? `${snippet.answer}\n\n💡 ${snippet.followUp}` : snippet.answer;
    }
  }

  return TUTOR_FALLBACK;
}

function eduhubAiDraftAnnouncement(prompt: string): string {
  const topic = prompt.replace(/rascunho|comunicado|avisar|sobre/gi, "").trim() || "evento escolar";
  return `**Rascunho de comunicado:**\n\n**Assunto:** ${topic.charAt(0).toUpperCase()}${topic.slice(1)}\n\nPrezados responsáveis e alunos,\n\nInformamos sobre ${topic}. Pedimos atenção às orientações enviadas pela coordenação.\n\nEm caso de dúvidas, entre em contato com a secretaria.\n\nAtenciosamente,\nEquipe escolar`;
}

function eduhubAiDirectorInsight(context: AiContext): string {
  const s = context.stats;
  if (!s) {
    return "Acesse **Alertas de risco** no menu para ver alunos com frequência crítica ou notas baixas. Posso resumir quando os dados estiverem carregados.";
  }
  const parts: string[] = ["**Panorama rápido da escola:**"];
  if (s.avgGrade != null) parts.push(`• Média geral: **${s.avgGrade.toFixed(1)}**`);
  if (s.attendanceRate != null) parts.push(`• Frequência média: **${Math.round(s.attendanceRate)}%**`);
  if (s.atRiskStudents != null && s.atRiskStudents > 0) {
    parts.push(`• ⚠️ **${s.atRiskStudents}** aluno(s) em situação de atenção (faltas ou notas)`);
  }
  if (s.pendingSubmissions != null && s.pendingSubmissions > 0) {
    parts.push(`• **${s.pendingSubmissions}** entrega(s) aguardando correção`);
  }
  parts.push("\nRecomendo priorizar contato com famílias dos alunos em risco e revisar comunicados sobre reforço.");
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
      `${input.childName} está com média ${input.avgGrade.toFixed(1)}. Reserve 20 min/dia para revisar matérias com nota mais baixa e combine metas semanais com a criança.`
    );
  }
  if (input.freqRate < 85) {
    tips.push(
      `Frequência em ${Math.round(input.freqRate)}%. Confirme rotina de sono e transporte; faltas repetidas merecem conversa com a coordenação.`
    );
  }
  if (input.pendingExercises > 0) {
    tips.push(
      `Há ${input.pendingExercises} exercício(s) pendente(s). Acompanhe prazos no boletim e evite deixar para a véspera.`
    );
  }
  if (tips.length === 0) {
    tips.push(`${input.childName} está em bom ritmo acadêmico. Continue reforçando hábitos de estudo e elogie esforço, não só nota.`);
  }
  return tips;
}
