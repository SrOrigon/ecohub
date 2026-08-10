# EduHub — Treinamento rápido para instituições

Guia de **2 horas** para direção, secretaria e professores piloto.

---

## Sessão 1 — Direção (45 min)

### Login e configuração inicial
1. Acesse `/login/escola` ou `/e/{slug}/login`
2. Vá em **Configurações** (`/dashboard/configuracoes`)
3. Configure:
   - Nome da escola e slug
   - Nota mínima e regras de XP
   - Períodos letivos / bimestres
   - Fechamento de bimestre (quando aplicável)

### Estrutura escolar
1. **Turmas** — crie turmas por ano/série
2. **Professores** — convide via e-mail ou link de convite
3. **Alunos** — matrícula manual ou link `/inscricao/{slug}`
4. **Responsáveis** — vincule pais aos alunos

### Ferramentas de gestão
| Menu | Uso |
|------|-----|
| Alertas de risco | Alunos com nota/frequência crítica |
| Relatórios | Panorama acadêmico |
| Agenda compartilhada | Feriados e eventos escolares |
| Comunicados | Avisos para toda comunidade |
| EduHub IA | Planos de aula, comunicados (equipe) |

---

## Sessão 2 — Secretaria (30 min)

1. **Matrículas** — aprovar inscrições online
2. **Autorizações** — formulários digitais para pais
3. **Documentos** — declarações e certificados
4. **Horários** — grade de aulas
5. **Mensagens** — canal família ↔ escola

---

## Sessão 3 — Professores piloto (45 min)

### Rotina diária
1. **Diário de classe** — registro do dia
2. **Frequência** — chamada digital
3. **Notas** — lançamento por disciplina

### Avaliação
1. **Exercícios** — criar atividade
2. **Gerar com EduHub IA** — questões (só equipe escolar)
3. Corrigir entregas — quiz automático + dissertativas manuais

### Engajamento
1. **Missões** — tarefas gamificadas
2. **Trilhas** — percursos de aprendizagem
3. **Comunicados** — avisos da turma

---

## Portal família e aluno

| Perfil | Acesso | Destaques |
|--------|--------|-----------|
| Responsável | `/login/responsavel` | Boletim, faltas, mensagens, tarefas de casa |
| Aluno | PIN + matrícula | Exercícios, XP, loja, trilhas |
| EduHub IA (aluno) | `/dashboard/assistente` | Dúvidas e dicas — **sem gabarito** |

---

## Semana piloto recomendada

| Dia | Ação |
|-----|------|
| 1 | Direção configura turmas + convida 2 professores |
| 2 | Professores lançam frequência e 1 exercício |
| 3 | Secretaria testa matrícula de 1 aluno novo |
| 4 | Responsáveis vinculados recebem acesso |
| 5 | Reunião de feedback + ajustes |

---

## Suporte técnico

| Problema | Solução |
|----------|---------|
| Não consigo logar | Verificar e-mail/senha; aluno usa PIN |
| IA não responde | Configurações → EduHub IA ativada |
| Dados sumiram | Verificar backup `/data/prod.db` |
| E-mail convite não chega | Configurar Resend no servidor |

Documentação completa: `docs/GUIA_INSTITUICOES.md`
