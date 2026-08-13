# Arquitetura EduHub — Revisão Técnica

## Comparativo das opções (revisão da conversa com Gemini)

### Opção 1: TypeScript Unificado (Next.js + Supabase) — **ESCOLHIDA**

| Critério | Nota | Comentário |
|----------|------|------------|
| Produtividade solo | ★★★★★ | Uma linguagem do DB ao browser |
| Custo inicial | ★★★★★ | Vercel + Supabase free tier |
| UI gamificada | ★★★★★ | React + Tailwind = interfaces modernas |
| Telas admin (Sponte) | ★★★★☆ | Shadcn/TanStack Table compensam |
| Curva de aprendizado | ★★★★☆ | Se você já domina JS/TS |

**Veredito:** Melhor equilíbrio para 1 dev pleno construindo tudo.

### Opção 2: Laravel + Filament + Inertia — **Alternativa válida**

| Critério | Nota | Comentário |
|----------|------|------------|
| CRUD administrativo | ★★★★★ | Filament gera 60% das telas Sponte |
| UI gamificada | ★★★☆☆ | Precisa construir mais do zero |
| Custo | ★★★★☆ | Render/Fly.io free, mas cold starts |
| Stack unificada | ★★★☆☆ | PHP + Vue/React (duas linguagens) |

**Veredito:** Escolha se você domina PHP e quer priorizar cadastros/relatórios antes da gamificação.

### Opção 3 (não mencionada): Django + HTMX

Boa para admin rápido, mas UI gamificada exige mais esforço front-end.

---

## Mapeamento de funcionalidades

### Do Sponte (ERP Escolar)

| Módulo Sponte | Status EduHub | Prioridade |
|---------------|---------------|------------|
| Cadastro escola/turmas/alunos | UI pronta | Fase 1 |
| Lançamento de notas | UI pronta | Fase 1 |
| Controle de frequência | UI pronta | Fase 1 |
| Boletim / relatórios PDF | Planejado | Fase 3 |
| Financeiro (mensalidades) | Fora do escopo inicial | Fase 5+ |
| Portal responsáveis | Planejado | Fase 4 |
| 2FA | Via Supabase Auth | Fase 3 |

### Do Gamefik (Gamificação)

| Módulo Gamefik | Status EduHub | Prioridade |
|----------------|---------------|------------|
| Missões e desafios | UI + schema DB | Fase 2 |
| XP / Níveis / Moedas | Schema + trigger SQL | Fase 2 |
| Badges / Conquistas | UI + schema DB | Fase 2 |
| Rankings por turma | Funcional | Fase 1 |
| App mobile aluno | PWA primeiro | Fase 4 |
| Quiz com IA | Opcional (Ollama local) | Fase 5+ |

---

## Infraestrutura gratuita

```
[Vercel]     Next.js app (100 GB bandwidth/mês free)
     ↓
[Supabase]   PostgreSQL 500MB + Auth + Realtime + Storage 1GB
     ↓
[Resend]     3.000 e-mails/mês (confirmação de conta)
     ↓
[Cloudflare R2] 10GB storage (materiais, avatares) — opcional
```

**Limite real:** ~500 alunos ativos confortavelmente no free tier. Escale quando houver receita.

---

## Decisões técnicas importantes

1. **Monorepo Next.js** — Não separe front/back inicialmente. Route Handlers (`app/api/`) bastam até ~10k usuários.

2. **Mock data primeiro** — Permite desenvolver UI sem depender de Supabase configurado. Troque por queries reais quando conectar.

3. **Multi-tenant por `school_id`** — Cada escola é isolada via Row Level Security no Supabase.

4. **Gamificação no PostgreSQL** — Triggers calculam XP; evita lógica duplicada no front.

5. **Não use microserviços** — Para 1 dev, monolito modular é a regra.

---

## Próximos passos recomendados

1. Criar projeto Supabase e rodar migration
2. Implementar auth real (login/registro)
3. CRUD de alunos/turmas com Supabase
4. Conectar gráficos a dados reais
5. Motor XP: nota ≥ 7 → +50 XP, presença → +10 XP
