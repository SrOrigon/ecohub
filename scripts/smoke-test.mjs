#!/usr/bin/env node
/**
 * Smoke test pós-deploy  -  verifica health e rotas públicas.
 * Uso: node scripts/smoke-test.mjs [baseUrl]
 * Ex.: node scripts/smoke-test.mjs https://seu-app.up.railway.app
 */

const base = (process.argv[2] ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);

const checks = [
  { name: "Health live", path: "/api/health/live", expectStatus: [200], json: true },
  { name: "Health API", path: "/api/health", expectStatus: [200, 503], json: true },
  { name: "Página inicial", path: "/", expectStatus: [200] },
  { name: "Login escola", path: "/login/escola", expectStatus: [200] },
  { name: "Registro escola", path: "/registro/escola", expectStatus: [200] },
  { name: "Rotas legado /demo bloqueadas", path: "/demo/director", expectStatus: [307, 308] },
];

let failed = 0;

console.log(`[smoke] Testando ${base}\n`);

for (const check of checks) {
  const url = `${base}${check.path}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const ok = check.expectStatus.includes(res.status);

    if (check.json && res.status === 200) {
      const body = await res.json();
      console.log(`${ok ? "✓" : "✗"} ${check.name}  -  ${res.status}  -  status=${body.status}`);
      if (body.checks) {
        console.log(`    database=${body.checks.database}, auth=${body.checks.authSecret}, mode=${body.mode}`);
      }
    } else {
      console.log(`${ok ? "✓" : "✗"} ${check.name}  -  ${res.status}`);
    }

    if (!ok) failed++;
  } catch (error) {
    console.log(`✗ ${check.name}  -  ERRO: ${error instanceof Error ? error.message : error}`);
    failed++;
  }
}

console.log(failed === 0 ? "\n[smoke] Todos os testes passaram." : `\n[smoke] ${failed} teste(s) falharam.`);
process.exit(failed === 0 ? 0 : 1);
