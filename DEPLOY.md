# Ecohub — Deploy

## Volume persistente (obrigatório)

Sem um **Volume Railway montado em `/data`**, cada deploy apaga logins, turmas e cadastros.

1. Abra o serviço **eduhub** no Railway
2. **Settings → Volumes → Add volume**
3. **Mount path:** `/data` (exatamente isso, sem barra extra)
4. Redeploy
5. Confira `GET /api/health`: `volumeMounted: true`, `goldenBackup: true` depois do primeiro cadastro

O app **recusa novos cadastros** se o volume não estiver montado.

## Variáveis de ambiente

### Obrigatórias (produção)

```env
ECOHUB_INSTITUTIONAL=1
NODE_ENV=production
DATABASE_URL=file:/data/prod.db
```

> **`AUTH_SECRET` é opcional.** O sistema gera e salva automaticamente em `/data/.auth_secret` no primeiro deploy. **Não use o texto de exemplo** da documentação como valor — deixe vazio ou remova a variável no Railway.
>
> O **volume em `/data` é obrigatório** para logins e dados persistirem entre deploys.

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

## Railway

1. Conecte o repositório GitHub (`SrOrigon/eduhub`, branch `main`)
2. **Volume** montado em `/data`
3. Configure as variáveis acima
4. Build: `npm run build` · Start: `npm start`
5. Health check: `GET /api/health` (configurado em `railway.toml`)
6. Smoke test: `npm run test:smoke -- https://seu-app.up.railway.app`

`railway.toml` usa **SQLite** com volume — não é PostgreSQL.

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
