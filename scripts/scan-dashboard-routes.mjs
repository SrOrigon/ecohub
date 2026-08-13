#!/usr/bin/env node
const base = process.argv[2] ?? "http://localhost:3000";

const routes = [
  "/dashboard",
  "/dashboard/alunos",
  "/dashboard/turmas",
  "/dashboard/notas",
  "/dashboard/frequencia",
  "/dashboard/gamificacao",
  "/dashboard/loja",
  "/dashboard/comunicados",
  "/dashboard/calendario",
  "/dashboard/relatorios",
  "/dashboard/configuracoes",
  "/dashboard/exercicios",
  "/dashboard/trilhas",
  "/dashboard/mensagens",
  "/dashboard/notificacoes",
  "/dashboard/leitura-geral",
  "/dashboard/engajamento",
  "/dashboard/rankings",
  "/dashboard/professores",
  "/dashboard/secretaria",
  "/dashboard/matriculas",
  "/dashboard/autorizacoes",
  "/dashboard/documentos",
  "/dashboard/diario",
  "/dashboard/horarios",
  "/dashboard/disciplinas",
  "/dashboard/agenda",
  "/dashboard/alertas",
  "/dashboard/historico",
  "/dashboard/boletim",
  "/dashboard/precisao-disciplinas",
  "/dashboard/metas-coletivas",
  "/dashboard/assistente",
  "/dashboard/busca",
  "/dashboard/perfil",
  "/dashboard/professor",
  "/dashboard/aluno",
  "/dashboard/responsavel",
];

const ERROR_MARKER = "Algo deu errado ao carregar";

async function main() {
  const { createScanSessionCookies } = await import("./scan-session.mjs");
  const jar = await createScanSessionCookies();

  const getCookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

  async function fetchWithCookies(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      redirect: "manual",
      headers: { cookie: getCookieHeader(), ...(opts.headers ?? {}) },
    });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    for (const raw of setCookie) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    return res;
  }

  console.log(`[scan] Sessão criada (${jar.size} cookie(s))\n`);

  let failed = 0;
  for (const route of routes) {
    try {
      let res = await fetchWithCookies(`${base}${route}`);
      for (let i = 0; i < 5 && res.status >= 300 && res.status < 400; i++) {
        const loc = res.headers.get("location");
        if (!loc) break;
        res = await fetchWithCookies(new URL(loc, base).href);
      }
      const html = await res.text();
      const hasError = html.includes(ERROR_MARKER);
      const ok = res.status === 200 && !hasError;
      console.log(`${ok ? "OK" : "FAIL"} ${route} — HTTP ${res.status}${hasError ? " (error boundary)" : ""}`);
      if (!ok) failed++;
    } catch (e) {
      console.log(`ERR  ${route} — ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }

  console.log(`\n[scan] ${failed} falha(s)`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
