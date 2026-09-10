"use client";

import type { SchoolSettings } from "@/lib/school-settings";

function shade(hex: string, amount: number) {
  const n = hex.replace("#", "");
  if (n.length !== 6) return hex;
  const r = Math.min(255, Math.max(0, parseInt(n.slice(0, 2), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(n.slice(2, 4), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(n.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function SchoolThemeProvider({
  branding,
  children,
}: {
  branding: SchoolSettings["branding"];
  children: React.ReactNode;
}) {
  const primary = branding.primaryColor || "#4f46e5";
  const accent = branding.accentColor || "#f59e0b";

  return (
    <div
      className="school-theme min-h-full"
      style={
        {
          "--school-primary": primary,
          "--school-primary-hover": shade(primary, -18),
          "--school-primary-soft": `${primary}1a`,
          "--school-primary-ring": `${primary}33`,
          "--school-accent": accent,
          "--focus-ring": primary,
        } as React.CSSProperties
      }
    >
      <div id="hud-root" />
      {children}
    </div>
  );
}
