#!/usr/bin/env node
const base = process.argv[2] ?? "http://localhost:3000";
const roles = process.argv.slice(3);
if (roles.length === 0) roles.push("director", "teacher", "student");

const routes = [
  "/dashboard",
  "/dashboard/leitura-geral",
  "/dashboard/historico",
  "/dashboard/engajamento",
  "/dashboard/gamificacao",
  "/dashboard/exercicios",
  "/dashboard/loja",
  "/dashboard/perfil",
];

const ERROR_MARKER = "Algo deu errado ao carregar";

async function scanRole(role) {
  const { createScanSessionCookies } = await import("./scan-session.mjs");
  const jar = await createScanSessionCookies({ role });

  const getCookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

  async function fetchWithCookies(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      redirect: "manual",
      headers: { cookie: getCookieHeader(), ...(opts.headers ?? {}) },
    });
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    return res;
  }

  console.log(`\n=== Papel: ${role} (cookies=${jar.size}) ===`);
  let failed = 0;

  for (const route of routes) {
    let res = await fetchWithCookies(`${base}${route}`);
    for (let i = 0; i < 5 && res.status >= 300 && res.status < 400; i++) {
      const loc = res.headers.get("location");
      if (!loc) break;
      res = await fetchWithCookies(new URL(loc, base).href);
    }
    const html = await res.text();
    const hasError = html.includes(ERROR_MARKER);
    const onLogin = html.includes("Entrar") && html.includes('type="password"');
    const ok = res.status === 200 && !hasError && !onLogin;
    console.log(`${ok ? "OK" : "FAIL"} ${route} — ${res.status}${hasError ? " (error boundary)" : ""}${onLogin ? " (login page)" : ""}`);
    if (!ok) failed++;
  }
  return failed;
}

async function main() {
  let total = 0;
  for (const role of roles) total += await scanRole(role);
  console.log(`\n[scan-roles] ${total} falha(s) total`);
  process.exit(total > 0 ? 1 : 0);
}

main();
