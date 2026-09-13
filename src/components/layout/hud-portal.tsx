"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

function subscribe() {
  return () => {};
}

function getSnapshot(): HTMLElement | null {
  return (
    document.getElementById("hud-root") ??
    document.querySelector<HTMLElement>(".school-theme") ??
    document.body
  );
}

function getServerSnapshot(): HTMLElement | null {
  return null;
}

/**
 * HUD no documento, fora de `.app-content`, mas ainda sob o tema da escola
 * (variáveis CSS). `position: fixed` continua relativo à viewport.
 */
export function HudPortal({ children }: { children: ReactNode }) {
  const target = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!target) return null;
  return createPortal(children, target);
}
