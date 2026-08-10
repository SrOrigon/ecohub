# EduHub — Deploy

## Modos

| Modo | Quando usar | Variável extra |
|------|-------------|----------------|
| **Institucional** | Escolas reais | — |
| **Demo** | Ambiente público de demonstração | `EDUHUB_ENABLE_DEMO=1` |

---

## Variáveis de ambiente

### Obrigatórias (institucional)

```env
NODE_ENV=production
DATABASE_URL=file:/data/prod.db
AUTH_SECRET=gere-um-segredo-longo-e-aleatorio-min-32-chars
```

### Demo pública (Railway atual)

```env
EDUHUB_ENABLE_DEMO=1
DATABASE_URL=file:/data/prod.db
AUTH_SECRET=recomendado-mesmo-no-demo
```

> **Importante:** sem `EDUHUB_ENABLE_DEMO=1`, o boot **não** cria contas demo e exige `AUTH_SECRET` válido.

### Recomendadas

```env
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
PLATFORM_ADMIN_EMAILS=admin@suaempresa.com.br
RESEND_API_KEY=re_...
EMAIL_FROM=EduHub <noreply@suaescola.com.br>
NEXT_PUBLIC_ROOT_DOMAIN=eduhub.app.br
PORT=3000
```

---

## Railway

1. Conecte o repositório GitHub
2. **Volume** montado em `/data`
3. Variables conforme modo (institucional ou demo)
4. Build: `npm run build` · Start: `npm start`
5. Health check: `GET /api/health`
6. Smoke test: `npm run test:smoke -- https://seu-app.up.railway.app`

`railway.toml` usa **SQLite** com volume — não é PostgreSQL.

---

## Primeiro deploy institucional

1. Configure variáveis (sem `EDUHUB_ENABLE_DEMO`)
2. Após deploy, acesse `/registro/escola` e cadastre a instituição
3. Siga o checklist em **`docs/GUIA_INSTITUICOES.md`**

## Primeiro deploy demo

1. Configure `EDUHUB_ENABLE_DEMO=1`
2. Seed/ensure-demo roda automaticamente no boot
3. Contas em `README.md`

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
npm run db:seed        # seed local (dev)
```

---

## Contas demo (modo EDUHUB_ENABLE_DEMO=1)

| E-mail | Senha | Papel |
|--------|-------|-------|
| admin@eduhub.local | demo123 | Diretor |
| secretaria@eduhub.local | demo123 | Secretaria |
| professor@eduhub.local | demo123 | Professor |
| mariana@responsavel.local | demo123 | Responsável |
| Matrícula `2026001` | PIN `123456` | Aluno |

Guia completo de testes: **`docs/GUIA_INSTITUICOES.md`**
