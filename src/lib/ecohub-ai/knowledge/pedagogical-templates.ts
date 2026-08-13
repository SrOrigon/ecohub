export function draftAnnouncement(topic: string, kind: "geral" | "reuniao" | "prova" | "feriado" | "evento" = "geral") {
  const t = topic.charAt(0).toUpperCase() + topic.slice(1);
  const templates: Record<string, string> = {
    reuniao: `**Assunto:** Convite — Reunião de pais e mestres\n\nPrezados responsáveis,\n\nConvidamos para reunião sobre **${t}**, em data e horário a confirmar pela secretaria.\n\nPedimos confirmação de presença.\n\nAtenciosamente,\nEquipe escolar`,
    prova: `**Assunto:** Aviso de avaliação — ${t}\n\nPrezados alunos e responsáveis,\n\nInformamos que haverá avaliação sobre **${t}**. Orientamos revisão dos conteúdos trabalhados em sala e entrega pontual de materiais.\n\nBons estudos!\n\nEquipe pedagógica`,
    feriado: `**Assunto:** Feriado / recesso — ${t}\n\nComunicamos que não haverá aula em **${t}**, conforme calendário escolar.\n\nRetomamos as atividades na data seguinte ao retorno.\n\nSecretaria escolar`,
    evento: `**Assunto:** Evento escolar — ${t}\n\nConvidamos toda a comunidade escolar para **${t}**. Detalhes de horário e local serão confirmados pelos professores.\n\nContamos com a participação de todos!\n\nEquipe escolar`,
    geral: `**Assunto:** ${t}\n\nPrezados responsáveis e alunos,\n\nInformamos sobre **${t}**. Pedimos atenção às orientações da coordenação.\n\nDúvidas: secretaria ou Ecohub IA.\n\nAtenciosamente,\nEquipe escolar`,
  };
  return `**Rascunho de comunicado:**\n\n${templates[kind]}`;
}

export function detectAnnouncementKind(text: string): "geral" | "reuniao" | "prova" | "feriado" | "evento" {
  const n = text.toLowerCase();
  if (/reuni|pais|mestres/.test(n)) return "reuniao";
  if (/prova|avalia|simulado|teste/.test(n)) return "prova";
  if (/feriad|recesso|ponto facult/.test(n)) return "feriado";
  if (/festa|evento|passeio|feira|olimp/.test(n)) return "evento";
  return "geral";
}

export function lessonPlan(topic: string, subject: string, duration = "50 min") {
  return `**Plano de aula — ${subject}**\n\n**Tema:** ${topic}\n**Duração:** ${duration}\n\n**1. Objetivo (BNCC):** Desenvolver compreensão de ${topic} por meio de explicação, prática guiada e autonomia.\n\n**2. Início (10 min)** — Aquecimento: pergunta diagnóstica ou problema simples sobre ${topic}.\n\n**3. Desenvolvimento (25 min)** — Exposição dialogada + exemplo resolvido na lousa + exercício em duplas.\n\n**4. Fechamento (10 min)** — Correção coletiva, síntese oral dos alunos.\n\n**5. Avaliação formativa:** observação + 2 questões rápidas (exit ticket).\n\n**6. Tarefa:** publicar exercício no Ecohub com recompensa de XP moderada.`;
}

export function rubricTemplate(topic: string) {
  return `**Rubrica — ${topic}**\n\n| Critério | Insuficiente (0–4) | Regular (5–6) | Bom (7–8) | Excelente (9–10) |\n|----------|-------------------|---------------|-----------|------------------|\n| Compreensão do conceito | Não demonstra | Parcial | Adequada | Profunda |\n| Aplicação / resolução | Incorreta | Com erros | Correta com lapsos | Correta e completa |\n| Clareza na comunicação | Confusa | Básica | Clara | Precisa e organizada |\n\nUse na correção de respostas abertas no Ecohub.`;
}

export function feedbackTemplate(studentName: string, strength: string, improvement: string) {
  return `**Feedback para ${studentName}:**\n\n${studentName}, parabéns por ${strength}. Para evoluir ainda mais, recomendo ${improvement}. Continue participando — seu esforço faz diferença!`;
}

export function studyPlan(topic: string, days = 5) {
  const steps = Array.from({ length: days }, (_, i) => {
    const d = i + 1;
    if (d === 1) return `**Dia ${d}:** Leia o material sobre ${topic} e grife conceitos-chave.`;
    if (d === days) return `**Dia ${d}:** Simulado cronometrado + revisão dos erros.`;
    return `**Dia ${d}:** Resolva 5 exercícios de ${topic} e explique um para alguém.`;
  });
  return `**Plano de estudos (${days} dias) — ${topic}**\n\n${steps.join("\n\n")}\n\n💡 Use a agenda do Ecohub para marcar cada dia.`;
}
