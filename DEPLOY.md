# Ecohub — Deploy

## Banco PostgreSQL (obrigatório para lançamento)

Cada deploy do Railway **apaga o disco do container**. SQLite em `/data` só sobrevive com Volume. O caminho oficial é **PostgreSQL gerenciado** — os logins não somem mais quando você atualiza o sistema.

### Passos no Railway (faça nesta ordem)

1. Abra o projeto do Ecohub
2. **New** → **Database** → **PostgreSQL** (espere ficar `Available`)
3. Serviço **eduhub** → **Variables**
4. **Apague** `DATABASE_URL` se o valor for `file:/data/prod.db` (isso gravava no disco temporário)
5. **Add variable** → nome `DATABASE_URL` → valor a referência do Postgres, por exemplo:
   `${{Postgres.DATABASE_URL}}`  
   (o nome do serviço Postgres pode aparecer como `Postgres` ou `PostgreSQL` no painel)
6. Confirme também `ECOHUB_INSTITUTIONAL=1`
7. **Deploy** / Redeploy o serviço **eduhub**
8. Confira `GET /api/health`: `"engine":"postgresql"`, `"persisted": true`, `"status":"ok"`
9. Só então acesse `/registro/escola` e cadastre a instituição

O app **recusa cadastros** enquanto não houver PostgreSQL (ou um Volume real em `/data`). Isso evita gravar a conta da escola em disco que some no próximo deploy.

`AUTH_SECRET` fica salvo na tabela `AppMeta` do Postgres — sessões e senhas (hash) sobrevivem a atualizações.

## Variáveis de ambiente

### Obrigatórias (produção)

```env
ECOHUB_INSTITUTIONAL=1
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

> **Não use** `DATABASE_URL=file:/data/prod.db` em produção.
>
> **`AUTH_SECRET` é opcional** com Postgres: o sistema grava o segredo no próprio banco. Se quiser fixar, use um valor aleatório com 32+ caracteres e **não troque** depois.

### Recomendadas

```env
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
PLATFORM_ADMIN_EMAILS=admin@suaempresa.com.br
RESEND_API_KEY=re_...
EMAIL_FROM=Ecohub <noreply@suaescola.com.br>
NEXT_PUBLIC_ROOT_DOMAIN=ecohub.app.br
PORT=3000
```

---

## Hobby US$ 5 (obrigatório no painel)

O `railway.toml` define 1 réplica, teto de **1 vCPU / 1 GB**, sleep quando idle e heap Node de 384 MB. Os **8 vCPU / 8 GB** da página Hobby são o máximo do plano, não o que o serviço deve usar. RAM custa ~US$ 10/GB/mês.

O Hobby cobra **US$ 5/mês** e inclui **US$ 5 de crédito**. Uso acima disso é cobrado à parte. O trial expirado **não** sobe o app até você assinar o Hobby.

No Railway, **antes** de Apply / Deploy (e logo após assinar o Hobby):

1. Serviço **eduhub** → Scale / Replica Limits: **1 vCPU** e **1 GB**.
2. Deploy → **Serverless**: ligado (`sleepApplication` no `railway.toml`).
3. Serviço **Postgres**: **0,5 vCPU** e **256–512 MB** (o banco não dorme; 0,5 GB 24h já são ~US$ 5 só de RAM).
4. Variável `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (rede privada). **Não** use `DATABASE_PUBLIC_URL`.
5. Workspace → **Usage**: alerta de e-mail em **US$ 4**. Hard limit de compute: o mínimo da Railway é **US$ 10** (não existe hard limit de US$ 5).
6. Sem réplicas extras, PR environments nem segundo serviço de app.
7. Desenvolvimento em **localhost** (`npm run setup:local` + `npm run dev`). Não aponte `.env.local` para o Postgres da Railway.

## Railway

1. Conecte o repositório GitHub (`SrOrigon/eduhub`, branch `main`)
2. **PostgreSQL** no mesmo projeto, com `DATABASE_URL` apontando para ele
3. Configure as variáveis acima
4. Build: `npm run build` · Start: `npm start`
5. Health check: `GET /api/health` (configurado em `railway.toml`)
6. Smoke test: `npm run test:smoke -- https://seu-app.up.railway.app`

`railway.toml` sobe o Next.js; a persistência oficial é **PostgreSQL** no Railway.

**Produção atual:** `https://eduhub-production-b513.up.railway.app`

---

## Checklist pós-deploy

Após cada deploy, confira `GET /api/health`. Exemplo de resposta saudável:

```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "authSecret": "ok",
    "persistence": "ok"
  },
  "persistence": {
    "databasePath": "/data/prod.db",
    "onPersistentVolume": true,
    "volumeWritable": true,
    "accounts": { "users": 1, "schools": 1, "persisted": true },
    "lastBackup": "/data/backups/ecohub-....db"
  }
}
```

| Campo | Esperado |
|-------|----------|
| `status` | `ok` |
| `checks.database` | `ok` |
| `checks.authSecret` | `ok` |
| `persistence.onPersistentVolume` | `true` |
| `persistence.accounts.persisted` | `true` |
| `persistence.accounts.users` | Estável ou crescente (não deve zerar) |

Teste manual: login em `/login/escola` com a conta da instituição.

---

## Primeiro deploy

1. Configure `ECOHUB_INSTITUTIONAL=1` e `DATABASE_URL=file:/data/prod.db`
2. Monte o volume em `/data` **antes** do primeiro cadastro
3. Após deploy, acesse `/registro/escola` e cadastre a instituição
4. Siga o checklist em **`docs/GUIA_INSTITUICOES.md`**

---

## Garantia de persistência (logins e dados das escolas)

O sistema foi configurado para **não perder contas nem registros** entre deploys:

| O quê | Onde fica | Proteção |
|-------|-----------|----------|
| Usuários, senhas (hash), escolas, turmas, etc. | `/data/prod.db` | Volume Railway em `/data` |
| Segredo de sessão (`AUTH_SECRET`) | `/data/.auth_secret` | Gerado uma vez e reutilizado |
| Backups automáticos | `/data/backups/` | Cópia após cada deploy (só se houver usuários) |
| **Backup dourado** | `/data/backups/ecohub-golden.db` | **Nunca apagado** — restaurado automaticamente se o banco zerar |
| Estado de persistência | `/data/.ecohub-persistence.json` | Contagem de usuários e último backup |

### Regras obrigatórias no Railway

1. **Volume montado em `/data`** — sem isso, nada acima persiste.
2. **`DATABASE_URL=file:/data/prod.db`** — se apontar para outro caminho, o startup redireciona para `/data` em produção.
3. **Uma réplica apenas** — SQLite não suporta múltiplas instâncias.
4. **Não defina `AUTH_SECRET` placeholder** — o arquivo `/data/.auth_secret` é a fonte de verdade.
5. **Nunca rode `npm run db:reset`** em produção — o comando é bloqueado automaticamente.
6. **Novos cadastros** (escola, aluno, responsável) só são aceitos com banco em `/data` — evita contas em disco efêmero.

### O que acontece em cada deploy

1. Valida que `/data` está gravável e fixa `DATABASE_URL` em `/data/prod.db`
2. **Restaura automaticamente** do backup dourado ou backups se o banco estiver vazio
3. `prisma migrate deploy` (só adiciona estrutura, **não apaga dados**)
4. Backup automático **somente se houver usuários** (nunca sobrescreve histórico com banco vazio)
5. Atualiza o **backup dourado** (`ecohub-golden.db`) com as contas atuais
6. Carrega `AUTH_SECRET` do volume e sobe o Next.js

Verifique após deploy: `GET /api/health` — deve retornar `persistence.accounts.persisted: true` e contagem de usuários estável.

### Backup manual (recomendado semanal)

```bash
npm run db:backup
```

Baixe periodicamente `/data/backups/` e `/data/prod.db` para storage externo (S3, Google Drive, etc.).

---

## Comandos úteis

```bash
npm install
npm run build          # build produção
npm run lint           # ESLint
npm run check          # lint + build
npm run test:smoke -- https://url   # smoke pós-deploy
npm run db:pilot       # escola piloto (apenas dev local)
```

---

## Atualizações sem Perda de Dados

Para atualizar o sistema sem afetar o login dos usuários nem perder registros do banco:

1. **Manter o segredo em `/data/.auth_secret`**:
   O arquivo no volume assina os tokens de sessão. Não substitua por placeholders no Railway. Se o segredo mudar, as sessões ativas expiram (basta entrar de novo) — **as contas no banco permanecem**.

2. **Migrações Não-Destrutivas**:
   Ao atualizar a versão do sistema com novas tabelas ou colunas, utilize sempre:
   ```bash
   npx prisma migrate deploy
   ```
   > ⚠️ **NUNCA** execute `prisma migrate reset` ou `prisma db push --force-reset` em produção, pois esses comandos apagam as tabelas.

3. **Backup antes da atualização**:
   Utilize a ferramenta integrada de backup:
   ```bash
   npm run db:backup
   ```
   Isso criará uma cópia com timestamp no diretório `backups/`.

Guia completo de testes: **`docs/GUIA_INSTITUICOES.md`**
