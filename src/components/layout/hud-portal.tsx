"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * HUD no documento, fora de `.app-content`, mas ainda sob o tema da escola
 * (variáveis CSS). `position: fixed` continua relativo à viewport.
 */
export function HudPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      const el = document.getElementById("hud-root") ?? document.querySelector<HTMLElement>(".school-theme") ?? document.body;
      setTarget(el);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || !target) return null;
  return createPortal(children, target);
}
