import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeDocumentHtml } from "../src/lib/sanitize-document-html";

test("remove script e evento de clique", () => {
  const clean = sanitizeDocumentHtml(
    `<p>Contrato</p><script>alert(1)</script><img src="https://escola.test/logo.png" onerror="alert(1)">`
  );
  assert.equal(clean.includes("script"), false);
  assert.equal(clean.includes("onerror"), false);
  assert.equal(clean.includes("https://escola.test/logo.png"), true);
  assert.equal(clean.includes("Contrato"), true);
});

test("bloqueia javascript: em link", () => {
  const clean = sanitizeDocumentHtml(`<a href="javascript:alert(1)">clique</a>`);
  assert.equal(clean.includes("javascript"), false);
  assert.equal(clean.includes("clique"), true);
});

test("mantém tabela e campo de mesclagem", () => {
  const clean = sanitizeDocumentHtml(`<table><tr><td>&lt;&lt;studentName&gt;&gt;</td></tr></table>`);
  assert.equal(clean.includes("&lt;&lt;studentName&gt;&gt;"), true);
  assert.equal(clean.includes("<table>"), true);
});
