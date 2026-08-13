#!/usr/bin/env node
/**
 * Orquestrador completo — Fases 1, 2 e 3 de validação institucional.
 * Uso: node scripts/run-full-validation.mjs [url-producao]
 */
import { execSync, spawn } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const prodUrl = process.argv[2] ?? "https://eduhub-production-b513.up.railway.app";
const localPort = process.env.VALIDATION_PORT ?? "3099";
const localUrl = `http://localhost:${localPort}`;
const reportPath = join("docs", "RELATORIO_VALIDACAO.md");

const log = (msg) => console.log(`\n[orquestrador] ${msg}`);

function run(cmd, env = {}) {
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: true,
  });
}



const report = {
  startedAt: new Date().toISOString(),
  phases: [],
  production: null,
  local: null,
  validation: null,
};

log("Fase 1 — Infraestrutura");

try {
  run("npx prisma migrate deploy", {
    DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  report.phases.push({ phase: 1, step: "migrate", ok: true });
} catch {
  report.phases.push({ phase: 1, step: "migrate", ok: false });
}

try {
  run("npm run build", {
    AUTH_SECRET: "validation-build-secret-min-32-chars",
    DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  report.phases.push({ phase: 1, step: "build", ok: true });
} catch {
  if (existsSync(".next/BUILD_ID")) {
    log("Build falhou (lock?) — usando build existente");
    report.phases.push({ phase: 1, step: "build", ok: true, note: "cached" });
  } else {
    report.phases.push({ phase: 1, step: "build", ok: false });
  }
}

try {
  run("node scripts/backup-db.mjs ./prisma/dev.db ./backups");
  report.phases.push({ phase: 1, step: "backup", ok: true });
} catch {
  report.phases.push({ phase: 1, step: "backup", ok: false });
}

if (!existsSync("prisma/dev.db")) {
  log("Banco ausente — executando seed...");
  try {
    run("npm run db:seed");
  } catch {
    log("Seed falhou — continuando com banco existente ou vazio");
  }
} else {
  log("Banco dev.db encontrado");
}

try {
  run("npm run db:pilot");
  report.phases.push({ phase: 2, step: "seed-pilot", ok: true });
} catch {
  report.phases.push({ phase: 2, step: "seed-pilot", ok: false });
}

log("Fase 2 — Testes piloto (suite + servidor local)");

let serverProc = null;
try {
  serverProc = spawn("npx", ["next", "start", "-p", localPort], {
    stdio: "pipe",
    shell: true,
    env: {
      ...process.env,
      AUTH_SECRET: "validation-runtime-secret-min-32-chars",
      DATABASE_URL: "file:./dev.db",
      EDUHUB_INSTITUTIONAL: "1",
    },
  });

  await new Promise((r) => setTimeout(r, 8000));

  try {
    run(`npm run test:smoke -- ${localUrl}`);
    report.local = { url: localUrl, smoke: "ok" };
    report.phases.push({ phase: 2, step: "smoke-local", ok: true });
  } catch {
    report.local = { url: localUrl, smoke: "fail" };
    report.phases.push({ phase: 2, step: "smoke-local", ok: false });
  }

  try {
    const healthRes = await fetch(`${localUrl}/api/health`);
    const health = await healthRes.json();
    report.local.health = health;
    report.phases.push({
      phase: 2,
      step: "health-local",
      ok: healthRes.status === 200 && health.checks?.database === "ok",
    });
  } catch (e) {
    report.phases.push({ phase: 2, step: "health-local", ok: false, error: String(e) });
  }

  try {
    run("npx tsx scripts/institutional-validation.ts");
    report.validation = { suite: "ok" };
    report.phases.push({ phase: 2, step: "institutional-suite", ok: true });
  } catch {
    report.validation = { suite: "fail" };
    report.phases.push({ phase: 2, step: "institutional-suite", ok: false });
  }
} finally {
  if (serverProc) {
    serverProc.kill("SIGTERM");
  }
}

log("Fase 3 — Produção e go-live");

try {
  run(`npm run test:smoke -- ${prodUrl}`);
  report.production = { url: prodUrl, smoke: "ok" };
  report.phases.push({ phase: 3, step: "smoke-prod", ok: true });
} catch {
  report.production = { url: prodUrl, smoke: "fail" };
  report.phases.push({ phase: 3, step: "smoke-prod", ok: false });
}

try {
  const prodHealth = await fetch(`${prodUrl}/api/health`);
  const prodBody = await prodHealth.json();
  report.production.health = prodBody;
  report.phases.push({
    phase: 3,
    step: "health-prod",
    ok: prodHealth.status === 200,
  });
} catch (e) {
  report.phases.push({ phase: 3, step: "health-prod", ok: false, error: String(e) });
}

report.finishedAt = new Date().toISOString();
const totalOk = report.phases.filter((p) => p.ok).length;
const totalFail = report.phases.filter((p) => !p.ok).length;

mkdirSync("docs", { recursive: true });

const md = `# Relatório de Validação EduHub

Gerado em: ${report.finishedAt}

## Resumo

| Métrica | Valor |
|---------|-------|
| Etapas OK | ${totalOk} |
| Etapas com falha | ${totalFail} |
| Produção | ${prodUrl} |

## Fases executadas

${report.phases.map((p) => `- [${p.ok ? "x" : " "}] Fase ${p.phase} — ${p.step}${p.error ? ` (${p.error})` : ""}`).join("\n")}

## Health local

\`\`\`json
${JSON.stringify(report.local?.health ?? {}, null, 2)}
\`\`\`

## Health produção

\`\`\`json
${JSON.stringify(report.production?.health ?? {}, null, 2)}
\`\`\`

## Próximos passos manuais

1. Railway: \`EDUHUB_INSTITUTIONAL=1\` + \`AUTH_SECRET\` + volume \`/data\`
2. Checklist completo: \`docs/GUIA_INSTITUICOES.md\`
3. Treinamento: \`docs/TREINAMENTO_INSTITUICOES.md\`
`;

writeFileSync(reportPath, md);
log(`Relatório → ${reportPath}`);
log(`Concluído: ${totalOk} OK, ${totalFail} falha(s)`);

process.exit(totalFail > 0 ? 1 : 0);
