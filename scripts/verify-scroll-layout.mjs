#!/usr/bin/env node
/**
 * Verifica scroll do layout dashboard (desktop + mobile drawer).
 * Uso: node scripts/verify-scroll-layout.mjs [baseUrl]
 */
import { appendFileSync } from "node:fs";
import { join } from "node:path";

const LOG = join(process.cwd(), "debug-9787c3.log");
const BASE = (process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

function log(entry) {
  appendFileSync(LOG, `${JSON.stringify(entry)}\n`, "utf8");
  console.log(entry.message, entry.data ?? "");
}

function measure(el) {
  if (!el) return null;
  return {
    clientH: el.clientHeight,
    scrollH: el.scrollHeight,
    overflowY: getComputedStyle(el).overflowY,
    canScroll: el.scrollHeight > el.clientHeight + 2,
  };
}

async function login(page, email = "diretor.piloto@instituicao.local") {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login/escola`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', "Piloto2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
}

async function verifyViewport(page, label, width, height, openMobileMenu = false) {
  await page.setViewportSize({ width, height });
  await page.goto(`${BASE}/dashboard/autorizacoes`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".app-shell", { timeout: 15000 });
  await page.waitForTimeout(800);

  if (openMobileMenu) {
    await page.click('button[aria-label="Abrir menu de navegação"]');
    await page.waitForSelector("#mobile-sidebar", { timeout: 5000 });
    await page.waitForTimeout(400);
  }

  const metrics = await page.evaluate((menuOpen) => {
    const content = document.querySelector(".app-content");
    const nav = document.querySelector(".sidebar-nav-scroll");
    const shell = document.querySelector(".app-shell");
    const drawer = document.querySelector("#mobile-sidebar");
    const header = document.querySelector(".header-bar");
    const bottomNav = document.querySelector(".mobile-bottom-nav");
    const main = document.querySelector(".app-main");
    const headerRect = header?.getBoundingClientRect();
    const bottomVisible =
      bottomNav && getComputedStyle(bottomNav).display !== "none"
        ? bottomNav.getBoundingClientRect()
        : null;

    return {
      menuOpen,
      viewportH: window.innerHeight,
      viewportW: window.innerWidth,
      shell: measure(shell),
      content: measure(content),
      sidebarNav: measure(nav),
      drawerVisible: drawer ? getComputedStyle(drawer).display !== "none" : false,
      hud: {
        headerH: headerRect?.height ?? null,
        headerTop: headerRect?.top ?? null,
        bottomNavH: bottomVisible?.height ?? null,
        bottomNavFixed: bottomNav ? getComputedStyle(bottomNav).position === "fixed" : null,
        bottomNavInsideContent: Boolean(bottomNav && content && content.contains(bottomNav)),
        mainClearsBottomNav:
          !bottomVisible || !main
            ? true
            : parseFloat(getComputedStyle(main).paddingBottom) >= bottomVisible.height - 8,
        contentIsScroller: content
          ? ["auto", "scroll"].includes(getComputedStyle(content).overflowY)
          : false,
      },
    };

    function measure(el) {
      if (!el) return null;
      return {
        clientH: el.clientHeight,
        scrollH: el.scrollHeight,
        overflowY: getComputedStyle(el).overflowY,
        canScroll: el.scrollHeight > el.clientHeight + 2,
      };
    }
  }, openMobileMenu);

  let navScrollTop = 0;
  if (metrics.sidebarNav?.canScroll) {
    navScrollTop = await page.evaluate(() => {
      const nav = document.querySelector(".sidebar-nav-scroll");
      if (!nav) return 0;
      nav.scrollTop = 240;
      return nav.scrollTop;
    });
  }

  let contentScrollTop = 0;
  if (metrics.content?.canScroll && !openMobileMenu) {
    contentScrollTop = await page.evaluate(() => {
      const c = document.querySelector(".app-content");
      if (!c) return 0;
      c.scrollTop = 320;
      return c.scrollTop;
    });
  }

  const entry = {
    sessionId: "9787c3",
    runId: "scroll-verify",
    hypothesisId: openMobileMenu ? "H-mobile-drawer" : "H-desktop-sidebar",
    location: "scripts/verify-scroll-layout.mjs",
    message: label,
    data: {
      ...metrics,
      navScrollTop,
      contentScrollTop,
      navScrollOk: metrics.sidebarNav?.canScroll ? navScrollTop > 0 : true,
      contentScrollOk: openMobileMenu
        ? true
        : metrics.content?.canScroll
          ? contentScrollTop > 0
          : true,
    },
    timestamp: Date.now(),
  };

  log(entry);
  return entry;
}

async function main() {
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await login(page);

    const desktop = await verifyViewport(page, "desktop sidebar scroll", 1366, 768, false);
    const mobileMenu = await verifyViewport(page, "mobile drawer scroll", 400, 642, true);
    const mobileContent = await verifyViewport(page, "mobile main content scroll", 400, 642, false);

    await login(page, "aluno.piloto@instituicao.local");
    await page.setViewportSize({ width: 400, height: 642 });
    await page.goto(`${BASE}/dashboard/aluno`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".app-shell", { timeout: 15000 });
    await page.waitForTimeout(800);
    const studentHud = await page.evaluate(() => {
      const quest = document.querySelector(".hud-quest");
      const nav = document.querySelector(".mobile-bottom-nav");
      const content = document.querySelector(".app-content");
      const questRect = quest?.getBoundingClientRect();
      const navRect = nav && getComputedStyle(nav).display !== "none" ? nav.getBoundingClientRect() : null;
      return {
        questPresent: Boolean(quest),
        questInsideContent: Boolean(quest && content && content.contains(quest)),
        overlapNav: Boolean(
          questRect && navRect && questRect.bottom > navRect.top + 4 && questRect.top < navRect.bottom
        ),
        navFixed: nav ? getComputedStyle(nav).position === "fixed" : false,
      };
    });
    log({
      sessionId: "9787c3",
      runId: "scroll-verify",
      hypothesisId: "H-student-quest-hud",
      location: "scripts/verify-scroll-layout.mjs",
      message: "student mobile quest HUD",
      data: studentHud,
      timestamp: Date.now(),
    });

    const studentHudOk =
      studentHud.navFixed &&
      !studentHud.questInsideContent &&
      !studentHud.overlapNav;

    const failed = [desktop, mobileMenu, mobileContent].filter((r) => {
      const hud = r.data.hud ?? {};
      const compact = (r.data.viewportW ?? 1366) < 768;
      const headerOk = typeof hud.headerH === "number" ? hud.headerH <= (compact ? 72 : 88) : true;
      const scrollerOk = r.data.menuOpen ? true : hud.contentIsScroller;
      const hudOk =
        scrollerOk &&
        !hud.bottomNavInsideContent &&
        headerOk &&
        (!compact || (hud.bottomNavFixed && hud.mainClearsBottomNav));
      return !r.data.navScrollOk || !r.data.contentScrollOk || !hudOk;
    });

    if (failed.length > 0 || !studentHudOk) {
      console.error(`\n[scroll-verify] ${failed.length} cenário(s) falharam.`);
      process.exit(1);
    }

    console.log("\n[scroll-verify] Todos os cenários passaram.");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
