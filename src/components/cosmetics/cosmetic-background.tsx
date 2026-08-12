"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getCosmeticDefinition } from "@/lib/cosmetics-catalog";

export function CosmeticBackgroundCard({
  backgroundKey,
  children,
  className,
}: {
  backgroundKey?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const cosmetic = getCosmeticDefinition(backgroundKey);

  if (!cosmetic || cosmetic.itemType !== "background") {
    return (
      <div
        className={cn(
          "overflow-hidden border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white transition-all duration-300",
          className
        )}
      >
        {children}
      </div>
    );
  }

  const getBackgroundStyles = (key: string) => {
    switch (key) {
      case "bg-galaxy":
        return "bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white border-2 border-purple-800 shadow-xl shadow-purple-950/40";
      case "bg-sunset":
        return "bg-gradient-to-br from-amber-500 via-rose-500 to-purple-700 text-white border-2 border-amber-300 shadow-xl shadow-rose-950/30";
      case "bg-cyberpunk":
        return "bg-gradient-to-br from-zinc-950 via-slate-900 to-fuchsia-950 text-white border-2 border-fuchsia-600 shadow-xl shadow-fuchsia-950/50";
      case "bg-royalty":
        return "bg-gradient-to-br from-blue-950 via-indigo-900 to-amber-950 text-amber-100 border-2 border-amber-400 shadow-xl shadow-amber-950/40";
      case "bg-emerald":
        return "bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-950 text-white border-2 border-emerald-500 shadow-xl shadow-teal-950/40";
      case "bg-rainbow":
        return "bg-gradient-to-br from-purple-700 via-pink-600 to-amber-500 text-white border-2 border-pink-300 shadow-xl shadow-pink-950/30";
      default:
        return "bg-gradient-to-br from-indigo-900 to-purple-900 text-white border-2 border-indigo-500";
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl transition-all duration-300",
        getBackgroundStyles(backgroundKey ?? ""),
        className
      )}
    >
      {children}
    </div>
  );
}
