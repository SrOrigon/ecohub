# Ecohub — Deploy

## Variáveis de ambiente

### Obrigatórias (produção)

```env
ECOHUB_INSTITUTIONAL=1
NODE_ENV=production
DATABASE_URL=file:/data/prod.db
AUTH_SECRET=gere-um-segredo-longo-e-aleatorio-min-32-chars
```

> Gere o `AUTH_SECRET` com: `openssl rand -base64 32`

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

1. Conecte o repositório GitHub
2. **Volume** montado em `/data`
3. Configure as variáveis acima
4. Build: `npm run build` · Start: `npm start`
5. Health check: `GET /api/health`
6. Smoke test: `npm run test:smoke -- https://seu-app.up.railway.app`

`railway.toml` usa **SQLite** com volume — não é PostgreSQL.

---

## Primeiro deploy

1. Configure `ECOHUB_INSTITUTIONAL=1`, `AUTH_SECRET` e `DATABASE_URL`
2. Após deploy, acesse `/registro/escola` e cadastre a instituição
3. Siga o checklist em **`docs/GUIA_INSTITUICOES.md`**

---

## Backup SQLite

Arquivo: `/data/prod.db` (volume). Copie periodicamente para storage externo.

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

1. **Manter o mesmo `AUTH_SECRET`**:
   O segredo `AUTH_SECRET` é utilizado para assinar os tokens de sessão. Mantenha o mesmo valor no seu arquivo `.env` ou variáveis de ambiente a cada deploy. Se o `AUTH_SECRET` for alterado, as sessões ativas serão invalidadas e os usuários precisarão relogar.

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
