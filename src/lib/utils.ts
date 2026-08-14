import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return " - ";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return " - ";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return " - ";
  }
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || isNaN(value)) return "0%";
  return `${Math.round(value)}%`;
}
