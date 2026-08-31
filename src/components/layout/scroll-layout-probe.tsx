"use client";

import { useEffect } from "react";

/** Diagnóstico de scroll do layout — session 9787c3 */
export function ScrollLayoutProbe() {
  useEffect(() => {
    const shell = document.querySelector(".app-shell");
    const content = document.querySelector(".app-content");
    const main = document.querySelector(".app-main");
    const navScroll = document.querySelector(".sidebar-nav-scroll");

    const payload = {
      sessionId: "9787c3",
      timestamp: Date.now(),
      runId: "scroll-probe",
      hypothesisId: "H-scroll-main",
      location: "scroll-layout-probe.tsx",
      message: "layout scroll metrics",
      data: {
        viewportH: window.innerHeight,
        docScrollH: document.documentElement.scrollHeight,
        docClientH: document.documentElement.clientHeight,
        bodyScrollH: document.body.scrollHeight,
        shell: shell
          ? {
              clientH: (shell as HTMLElement).clientHeight,
              scrollH: (shell as HTMLElement).scrollHeight,
              overflow: getComputedStyle(shell as Element).overflow,
            }
          : null,
        content: content
          ? {
              clientH: (content as HTMLElement).clientHeight,
              scrollH: (content as HTMLElement).scrollHeight,
              overflowY: getComputedStyle(content as Element).overflowY,
              canScroll: (content as HTMLElement).scrollHeight > (content as HTMLElement).clientHeight,
            }
          : null,
        main: main
          ? { scrollH: (main as HTMLElement).scrollHeight, clientH: (main as HTMLElement).clientHeight }
          : null,
        sidebarNav: navScroll
          ? {
              scrollH: (navScroll as HTMLElement).scrollHeight,
              clientH: (navScroll as HTMLElement).clientHeight,
              canScroll: (navScroll as HTMLElement).scrollHeight > (navScroll as HTMLElement).clientHeight,
            }
          : null,
      },
    };

    // #region agent log
    fetch("http://127.0.0.1:7835/ingest/5ebca1af-63db-48d1-b506-1de1b9e39b43", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9787c3" },
      body: JSON.stringify(payload),
    }).catch(() => {});
    // #endregion
  }, []);

  return null;
}
