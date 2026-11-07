export type ReportFilterKey =
  | "turma"
  | "aluno"
  | "nome"
  | "situacao"
  | "periodo"
  | "ordem"
  | "visualizar"
  | "minFaltas";

export type ReportDefinition = {
  id: string;
  group: string;
  title: string;
  description: string;
  filters: ReportFilterKey[];
  viewOptions?: Array<{ value: string; label: string }>;
  orderOptions?: Array<{ value: string; label: string }>;
};

const periodo: ReportFilterKey[] = ["turma", "periodo"];
const turmaAlunoPeriodo: ReportFilterKey[] = ["turma", "aluno", "periodo"];

export const REPORT_CATALOG: ReportDefinition[] = [
  { id: "aniversariantes", group: "Alunos", title: "Aniversariantes", description: "Aniversário, nome e turmas.", filters: ["turma", "situacao", "periodo", "ordem"], orderOptions: [{ value: "nome", label: "Nome" }, { value: "nascimento", label: "Data de nascimento" }] },
  { id: "cadastro", group: "Alunos", title: "Dados do cadastro", description: "Matrícula, turma, situação, e-mail e celular.", filters: ["turma", "nome", "situacao", "ordem"], orderOptions: [{ value: "nome", label: "Nome" }, { value: "turma", label: "Turma" }] },
  { id: "historico", group: "Alunos", title: "Histórico geral do aluno", description: "Situação, pagamentos registrados e faltas.", filters: ["turma", "aluno", "situacao", "periodo"] },
  { id: "alunos-situacao", group: "Alunos", title: "Alunos por situação", description: "Quantos alunos estão cursando ou inativos.", filters: ["turma"] },
  { id: "pessoas-sem-foto", group: "Alunos", title: "Pessoas sem fotos", description: "Usuários da escola sem foto de perfil.", filters: ["nome"] },
  { id: "matriculas", group: "Alunos", title: "Matrículas e rematrículas", description: "Pedidos de matrícula e vínculos ativos nas turmas.", filters: ["turma", "periodo"] },

  { id: "abandonos", group: "Didático", title: "Abandonos", description: "Alunos marcados como inativos.", filters: ["turma"] },
  { id: "acompanhamento", group: "Didático", title: "Acompanhamento", description: "Atividades registradas no perfil do aluno.", filters: turmaAlunoPeriodo },
  { id: "agendamentos", group: "Didático", title: "Agendamentos", description: "Horários marcados na agenda da escola.", filters: ["periodo"] },
  { id: "conselho", group: "Didático", title: "Alunos em conselho de classe", description: "Média do aluno comparada à nota mínima da escola.", filters: ["turma"] },
  { id: "exame", group: "Didático", title: "Alunos em exame final", description: "Médias abaixo da nota mínima e ainda perto dela.", filters: ["turma"] },
  { id: "recuperacao", group: "Didático", title: "Alunos em recuperação", description: "Médias abaixo da nota mínima definida pela escola.", filters: ["turma"] },
  { id: "faltantes", group: "Didático", title: "Alunos faltantes", description: "Alunos com faltas no período.", filters: ["turma", "periodo", "minFaltas"] },
  { id: "atividades", group: "Didático", title: "Atividades complementares", description: "Tarefas de casa lançadas para os alunos.", filters: turmaAlunoPeriodo },
  { id: "aulas-livres", group: "Didático", title: "Aulas livres", description: "Turmas que ainda não têm professor responsável.", filters: [] },
  { id: "frequencia", group: "Didático", title: "Frequência de alunos", description: "Presenças, faltas e atrasos.", filters: ["turma", "aluno", "periodo", "visualizar", "minFaltas"], viewOptions: [{ value: "todas", label: "Todas" }, { value: "faltas", label: "Faltas" }, { value: "presencas", label: "Presenças" }] },
  { id: "dependencias", group: "Didático", title: "Dependências", description: "Disciplinas com média abaixo da nota mínima.", filters: ["turma", "aluno"] },
  { id: "diario", group: "Didático", title: "Diário de classe", description: "Aulas registradas no diário.", filters: periodo },
  { id: "diario-individual", group: "Didático", title: "Diário de classe individual", description: "Faltas e presenças de um aluno, com o diário da turma.", filters: ["turma", "aluno", "periodo"] },
  { id: "disponibilidade", group: "Didático", title: "Disponibilidade de professores", description: "Horários livres cadastrados e grade das turmas.", filters: [] },
  { id: "info-matriculas", group: "Didático", title: "Informações de matrículas", description: "Em qual turma cada aluno está e desde quando.", filters: ["turma"] },
  { id: "mapa-salas", group: "Didático", title: "Mapa de salas", description: "Sala, dia, horário e disciplina da grade.", filters: ["turma"] },
  { id: "mudancas-turma", group: "Didático", title: "Mudanças de turmas", description: "Vínculos de turma que já foram encerrados.", filters: ["turma", "periodo"] },
  { id: "notas-disciplina", group: "Didático", title: "Notas por disciplina", description: "Média, maior e menor nota de cada disciplina.", filters: ["turma"] },
  { id: "ocorrencias", group: "Didático", title: "Ocorrências", description: "Registros feitos pelos professores.", filters: turmaAlunoPeriodo },
  { id: "previsao-notas", group: "Didático", title: "Previsão de notas para aprovação", description: "Quanto falta para o aluno chegar na nota mínima.", filters: ["turma", "aluno"] },
  { id: "professores-pendentes", group: "Didático", title: "Professores com lançamentos pendentes", description: "Turmas com professor e ainda sem nota lançada.", filters: ["turma"] },
  { id: "professores-turma", group: "Didático", title: "Professores por turma", description: "Professor responsável e quem acompanha a turma.", filters: ["turma"] },

  { id: "documentos", group: "Documentos pedagógicos", title: "Documentos emitidos", description: "Contratos, fichas, históricos e outros documentos já gerados.", filters: ["turma", "aluno", "visualizar"], viewOptions: [{ value: "todos", label: "Todos" }, { value: "contract", label: "Contrato" }, { value: "certificado", label: "Certificado" }, { value: "ficha", label: "Ficha individual" }, { value: "historico", label: "Histórico escolar" }, { value: "ata", label: "Ata" }, { value: "relatorio", label: "Relatório final" }] },

  { id: "estoque-itens", group: "Estoque", title: "Itens e kits", description: "Prêmios da loja, preço em moedas e quantidade em estoque.", filters: ["nome"] },
  { id: "estoque-saidas", group: "Estoque", title: "Saídas", description: "Resgates feitos pelos alunos.", filters: ["aluno", "periodo"] },
  { id: "estoque-entradas", group: "Estoque", title: "Entradas", description: "Itens incluídos na loja, com a data de cadastro e o estoque atual.", filters: ["periodo"] },

  { id: "financeiro", group: "Financeiro", title: "Parcelas e situação", description: "Mensalidades com vencimento, valor e situação.", filters: ["turma", "aluno", "visualizar"], viewOptions: [{ value: "todas", label: "Todas" }, { value: "pendentes", label: "Pendentes" }, { value: "avencer", label: "A vencer" }, { value: "quitadas", label: "Quitadas" }] },
  { id: "parcelas-pendentes", group: "Financeiro", title: "Alunos x parcelas pendentes", description: "Quem está com parcela vencida ou que vence hoje.", filters: ["turma"] },
  { id: "balancete", group: "Financeiro", title: "Balancete financeiro", description: "Totais por situação das parcelas.", filters: ["turma"] },
  { id: "balancete-aluno", group: "Financeiro", title: "Balancete financeiro por aluno", description: "Valor em aberto e valor quitado de cada aluno.", filters: ["turma", "aluno"] },
  { id: "contas-receber", group: "Financeiro", title: "Contas a receber", description: "Parcelas em aberto, somadas por aluno.", filters: ["turma"] },
  { id: "fluxo", group: "Financeiro", title: "Fluxo e previsão", description: "Valores por mês de vencimento, separados em quitado e em aberto.", filters: ["turma"] },
  { id: "recebimentos", group: "Financeiro", title: "Recebimentos", description: "Pagamentos de mensalidade já registrados.", filters: ["turma", "aluno", "periodo"] },
  { id: "log-recibos", group: "Financeiro", title: "Log de recibos", description: "Código, valor e data de cada recibo.", filters: ["aluno", "periodo"] },
  { id: "sintetico-categoria", group: "Financeiro", title: "Sintético por categoria", description: "Totais agrupados pelo nome da parcela.", filters: ["turma"] },
  { id: "valores-curso", group: "Financeiro", title: "Valores por curso", description: "Soma das parcelas pelo curso da turma.", filters: [] },
  { id: "valores-turma", group: "Financeiro", title: "Valores por turma", description: "Soma das parcelas de cada turma.", filters: ["turma"] },
  { id: "ticket-medio", group: "Financeiro", title: "Ticket médio do aluno", description: "Média do valor das parcelas por aluno.", filters: ["turma"] },

  { id: "comunicados", group: "Gerencial", title: "Comunicados", description: "Avisos publicados para a escola ou para uma turma.", filters: ["turma", "periodo"] },
  { id: "funcionarios", group: "Gerencial", title: "Informações de funcionários", description: "Direção, secretaria e professores.", filters: ["nome"] },
  { id: "log-acessos", group: "Gerencial", title: "Log de acessos", description: "Sessões abertas no sistema, sem expor o token.", filters: ["nome", "periodo"] },
  { id: "log-exclusao", group: "Gerencial", title: "Log de exclusão", description: "Ações de exclusão registradas na auditoria.", filters: ["periodo"] },
  { id: "log-auditoria", group: "Gerencial", title: "Log de trabalhos", description: "Ações recentes de quem usa o painel.", filters: ["periodo"] },
  { id: "sintetico-turma", group: "Gerencial", title: "Sintético por turma", description: "Alunos, parcelas em aberto e parcelas quitadas.", filters: ["turma"] },
];
