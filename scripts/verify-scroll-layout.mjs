#!/usr/bin/env node
/**
 * Verifica scroll do layout dashboard (evidência runtime).
 * Requer: npm run dev em localhost:3000 + seed piloto.
 */
import { appendFileSync } from "node:fs";
import { join } from "node:path";

const LOG = join(process.cwd(), "debug-9787c3.log");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

function log(entry) {
  appendFileSync(LOG, `${JSON.stringify(entry)}\n`, "utf8");
  console.log(entry.message, entry.data ?? "");
}

async function main() {
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  try {
    await page.goto(`${BASE}/login/escola`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.fill('input[name="email"], input[type="email"]', "diretor.piloto@instituicao.local");
    await page.fill('input[name="password"], input[type="password"]', "Piloto2026!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    await page.goto(`${BASE}/dashboard/autorizacoes`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".app-shell", { timeout: 15000 });
    await page.waitForTimeout(1500);

    const metrics = await page.evaluate(() => {
      const content = document.querySelector(".app-content");
      const nav = document.querySelector(".sidebar-nav-scroll");
      const shell = document.querySelector(".app-shell");

      const measure = (el) =>
        el
          ? {
              clientH: el.clientHeight,
              scrollH: el.scrollHeight,
              overflowY: getComputedStyle(el).overflowY,
              canScroll: el.scrollHeight > el.clientHeight + 2,
            }
          : null;

      return {
        viewportH: window.innerHeight,
        shell: measure(shell),
        content: measure(content),
        sidebarNav: measure(nav),
      };
    });

    if (metrics.sidebarNav?.canScroll) {
      await page.evaluate(() => {
        const nav = document.querySelector(".sidebar-nav-scroll");
        if (nav) nav.scrollTop = 200;
      });
    }

    const afterNavScroll = await page.evaluate(() => {
      const nav = document.querySelector(".sidebar-nav-scroll");
      return nav
        ? { scrollTop: nav.scrollTop, canScroll: nav.scrollHeight > nav.clientHeight + 2 }
        : null;
    });

    if (metrics.content?.canScroll) {
      await page.evaluate(() => {
        const c = document.querySelector(".app-content");
        if (c) c.scrollTop = 400;
      });
    }

    const afterContentScroll = await page.evaluate(() => {
      const c = document.querySelector(".app-content");
      return c ? { scrollTop: c.scrollTop, canScroll: c.scrollHeight > c.clientHeight + 2 } : null;
    });

    log({
      sessionId: "9787c3",
      runId: "playwright-verify",
      hypothesisId: "H-scroll-main",
      location: "scripts/verify-scroll-layout.mjs",
      message: "initial metrics",
      data: metrics,
      timestamp: Date.now(),
    });

    log({
      sessionId: "9787c3",
      runId: "playwright-verify",
      hypothesisId: "H-scroll-sidebar",
      location: "scripts/verify-scroll-layout.mjs",
      message: "sidebar scroll after programmatic scroll",
      data: afterNavScroll,
      ok: afterNavScroll?.canScroll ? afterNavScroll.scrollTop > 0 : true,
      timestamp: Date.now(),
    });

    log({
      sessionId: "9787c3",
      runId: "playwright-verify",
      hypothesisId: "H-scroll-main",
      location: "scripts/verify-scroll-layout.mjs",
      message: "content scroll after programmatic scroll",
      data: afterContentScroll,
      ok: afterContentScroll?.canScroll ? afterContentScroll.scrollTop > 0 : true,
      timestamp: Date.now(),
    });
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
