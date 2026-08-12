"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FrameKey =
  | "frame-gold"
  | "frame-neon"
  | "frame-fire"
  | "frame-emerald"
  | "frame-galaxy"
  | "frame-rainbow"
  | "frame-diamond"
  | string;

export function CosmeticFrame({
  frameKey,
  children,
  className,
  size = "md",
}: {
  frameKey?: FrameKey | null;
  children: ReactNode;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  if (!frameKey) {
    return <>{children}</>;
  }

  const paddingSizes = {
    xs: "p-0.5",
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2",
    xl: "p-2.5",
  };

  const getFrameStyles = (key: string) => {
    switch (key) {
      case "frame-gold":
        return "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] ring-2 ring-amber-200 animate-pulse";
      case "frame-neon":
        return "bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 shadow-[0_0_15px_rgba(168,85,247,0.6)] ring-2 ring-cyan-300";
      case "frame-fire":
        return "bg-gradient-to-r from-red-600 via-amber-500 to-orange-400 shadow-[0_0_18px_rgba(239,68,68,0.7)] ring-2 ring-amber-300";
      case "frame-emerald":
        return "bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-2 ring-teal-200";
      case "frame-galaxy":
        return "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shadow-[0_0_18px_rgba(147,51,234,0.6)] ring-2 ring-indigo-300";
      case "frame-rainbow":
        return "bg-gradient-to-r from-red-500 via-yellow-400 via-emerald-400 via-blue-500 to-purple-500 shadow-[0_0_12px_rgba(59,130,246,0.5)] ring-2 ring-pink-300";
      case "frame-diamond":
        return "bg-gradient-to-r from-slate-100 via-sky-200 to-indigo-200 shadow-[0_0_20px_rgba(186,230,253,0.8)] ring-2 ring-white";
      default:
        return "bg-gradient-to-r from-indigo-400 to-purple-500 shadow-md";
    }
  };

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full transition-transform duration-300 hover:scale-105",
        paddingSizes[size],
        getFrameStyles(frameKey),
        className
      )}
    >
      <div className="relative rounded-full">{children}</div>
    </div>
  );
}
