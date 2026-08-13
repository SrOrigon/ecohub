# EduHub — Guia para implantação em instituições

Este guia cobre deploy, configuração inicial e **checklist de testes** antes de colocar o EduHub em uso real numa escola.

---

## 1. Modo de operação

O EduHub em produção opera em **modo institucional**: cada escola se cadastra em `/registro/escola` e gerencia seus próprios usuários. Não há contas ou rotas de demonstração automáticas.

---

## 2. Variáveis de ambiente

### Obrigatórias (institucional)

```env
NODE_ENV=production
EDUHUB_INSTITUTIONAL=1
DATABASE_URL=file:/data/prod.db
AUTH_SECRET=<segredo-aleatorio-minimo-32-caracteres>
```

> Gere o `AUTH_SECRET` com: `openssl rand -base64 32`

### Recomendadas

```env
NEXT_PUBLIC_APP_URL=https://sua-instituicao.eduhub.app.br
PLATFORM_ADMIN_EMAILS=admin@suaempresa.com.br
RESEND_API_KEY=re_...
EMAIL_FROM=EduHub <noreply@suaescola.com.br>
NEXT_PUBLIC_ROOT_DOMAIN=eduhub.app.br
```

---

## 3. Deploy (Railway)

1. Conecte o repositório GitHub
2. Crie um **Volume** montado em `/data`
3. Configure as variáveis (seção 2)
4. Deploy automático via `npm start` → `scripts/start-production.mjs`
5. Verifique: `GET /api/health` → `"status": "ok"`
6. Rode smoke test: `npm run test:smoke -- https://seu-dominio.com`

### Backup do banco (SQLite)

O arquivo de dados fica em `/data/prod.db` (volume Railway).

```bash
# Exemplo: copiar backup do volume
cp /data/prod.db /data/backups/prod-$(date +%Y%m%d).db
```

Agende backup diário no painel da plataforma ou cron no VPS.

---

## 4. Primeiro acesso (instituição nova)

1. Acesse **`/registro/escola`**
2. Preencha CNPJ, dados da escola e diretor
3. Aguarde verificação (automática ou manual via plataforma)
4. Login em **`/login/escola`** ou portal **`/e/{slug}/login`**
5. Em **Configurações**:
   - Períodos letivos e bimestres
   - Nota mínima e regras de XP
   - Disciplinas e turmas
   - Nome da assistente IA (opcional)

---

## 5. Papéis e fluxos principais

| Papel | Primeiro passo após login |
|-------|---------------------------|
| Diretor | Configurações → Turmas → Professores |
| Secretaria | Matrículas → Autorizações → Documentos |
| Professor | Exercícios → Diário → Frequência |
| Responsável | Vincular filho → Boletim → Mensagens |
| Aluno | PIN/matrícula → Exercícios → Trilhas |

---

## 6. Checklist de testes (pré go-live)

Marque cada item antes de liberar para a comunidade escolar.

### Infraestrutura

- [ ] `/api/health` retorna `200` com `database: ok`
- [ ] `AUTH_SECRET` configurado (mínimo 32 caracteres)
- [ ] Volume `/data` persistente (dados sobrevivem redeploy)
- [ ] `npm run test:smoke` passa no URL de produção
- [ ] Backup do `prod.db` testado (restore em ambiente de staging)

### Autenticação

- [ ] Registro de nova escola (`/registro/escola`)
- [ ] Login diretor (`/login/escola`)
- [ ] Login professor (e-mail/senha)
- [ ] Convite professor (`/convite/professor/[token]`)
- [ ] Login responsável (`/login/responsavel`)
- [ ] Login aluno por PIN/matrícula (`/login/aluno`)
- [ ] Logout e proteção de rotas (`/dashboard/*`)

### Gestão acadêmica

- [ ] Criar turma e vincular alunos
- [ ] Lançar notas e visualizar boletim
- [ ] Registrar frequência
- [ ] Fechamento de bimestre (Configurações)
- [ ] Alertas de risco (`/dashboard/alertas`)

### Secretaria e matrículas

- [ ] Link de inscrição (`/inscricao/{slug}`)
- [ ] Aprovar/rejeitar matrícula (`/dashboard/matriculas`)
- [ ] Autorizações digitais
- [ ] Documentos institucionais

### Comunicação

- [ ] Publicar comunicado
- [ ] Agenda compartilhada (feriados/eventos)
- [ ] Mensagens entre família e escola
- [ ] Export ICS do calendário

### Exercícios e gamificação

- [ ] Criar exercício (professor)
- [ ] Gerar questões com EduHub IA *(apenas equipe escolar)*
- [ ] Aluno entrega exercício
- [ ] Correção automática (múltipla escolha) e manual (dissertativa)
- [ ] XP, níveis e loja de recompensas

### EduHub IA

- [ ] Assistente acessível por perfil (`/dashboard/assistente`)
- [ ] **Aluno NÃO consegue** gerar exercícios ou gabarito no chat
- [ ] Professor consegue gerar questões na criação de exercícios
- [ ] Responsável vê dicas personalizadas no portal

### Multi-escola (se aplicável)

- [ ] Isolamento: escola A não vê dados da escola B
- [ ] Admin plataforma aprova escola pendente (`PLATFORM_ADMIN_EMAILS`)
- [ ] Portal por slug `/e/{slug}`

---

## 7. Go-live

1. Definir `EDUHUB_INSTITUTIONAL=1` e `AUTH_SECRET` no ambiente de produção
2. Trocar senhas padrão de qualquer conta de teste
3. Treinar direção, secretaria e 1–2 professores piloto
4. Semana piloto com uma turma antes de escola toda
5. Monitorar `/api/health` e logs de erro

---

## 8. Suporte e contatos internos

| Problema | Verificar |
|----------|-----------|
| Login "Servidor mal configurado" | `AUTH_SECRET` ≥ 32 chars |
| Dados sumiram após deploy | Volume `/data` montado? |
| E-mail de convite não chega | `RESEND_API_KEY` e `EMAIL_FROM` |
| IA desativada | Configurações → EduHub IA |
