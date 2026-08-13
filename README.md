# Ecohub — Plataforma Educacional Funcional

Sistema unificado de **gestão escolar** + **gamificação educacional**, totalmente funcional com banco de dados local.

## O que funciona agora

- **Autenticação real** (login, registro, logout, proxy de sessão)
- **Banco SQLite** via Prisma (sem precisar configurar Supabase)
- **CRUD completo**: alunos, turmas, notas, frequência, missões, professores
- **Gamificação automática**: XP por notas, presença e missões; badges; ranking
- **Loja de recompensas**: alunos gastam moedas; diretor cadastra prêmios e acompanha resgates
- **Portal de responsáveis**: pais/responsáveis acompanham notas, frequência, missões e resgates dos filhos
- **Dashboards** com gráficos alimentados por dados reais
- **Portal do aluno** com missões, XP, moedas, loja e conquistas
- **Boletim imprimível** por aluno (acessível também por responsáveis vinculados)
- **Notificações in-app**: sino no header + página completa; alertas automáticos (notas, missões, loja)
- **Multi-perfil**: diretor, professor, aluno, responsável (menus por papel)

## Como rodar

```bash
cd "c:\Users\DeadW\Desktop\Projeto-estudante"
npm install
npm run dev
```

Acesse **http://localhost:3000**

### Desenvolvimento local (opcional)

Para testes com uma escola piloto de validação:

```bash
npm run db:pilot
```

Isso cria a escola `escola-piloto-validacao` com contas de teste locais (ver saída do comando). **Não use essas credenciais em produção.**

## Fluxos principais

### Loja de recompensas (`/dashboard/loja`)
- **Aluno**: resgata prêmios com moedas ganhas em missões e gamificação
- **Diretor**: cadastra recompensas, define custo/estoque, ativa/desativa itens

### Portal de responsáveis (`/dashboard/responsavel`)
- **Responsável**: vê resumo e detalhes de cada filho vinculado
- **Diretor** (`/dashboard/responsaveis`): cadastra responsáveis e vincula a alunos

### Notificações (`/dashboard/notificacoes`)
- Alertas automáticos quando notas são lançadas, missões concluídas, resgates na loja etc.
- Sino no header com preview; marcar como lida individual ou em lote

## Comandos úteis

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # compilar produção
npm run db:migrate   # aplicar migrations
npm run db:pilot     # escola piloto para testes locais
npm run db:reset     # resetar banco + migrations
npm run check        # lint + build
npm run test:smoke -- https://sua-url   # smoke pós-deploy
```

## Implantação em instituições

Para colocar o Ecohub numa escola real:

1. Leia **`DEPLOY.md`** (variáveis e Railway)
2. Siga **`docs/GUIA_INSTITUICOES.md`** (checklist completo de testes)
3. Cadastre a escola em **`/registro/escola`**
4. Verifique **`GET /api/health`** após o deploy


```
src/
  app/              # Rotas (App Router)
  actions/          # Server Actions (auth, CRUD, rewards, parents)
  components/       # UI, forms, charts, layout
  lib/              # db, auth, queries, gamification, school-setup
prisma/
  schema.prisma     # Modelo de dados
  dev.db            # Banco SQLite (gerado localmente)
```

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Front + API | Next.js 16 + TypeScript |
| Banco | Prisma + SQLite (local, zero config) |
| Auth | JWT em cookie httpOnly |
| UI | Tailwind CSS 4 |
| Gráficos | Recharts |

## Migração futura para Supabase

O schema SQL em `supabase/migrations/` está pronto para quando quiser hospedar na nuvem. Basta trocar `DATABASE_URL` para PostgreSQL e ajustar o provider no Prisma.

## Licença

Projeto educacional — uso livre.
